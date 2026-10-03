package com.bidflow.backend.service;

import com.bidflow.backend.dto.AdminCategoryResponse;
import com.bidflow.backend.dto.CategoryRequest;
import com.bidflow.backend.dto.CategoryResponse;
import com.bidflow.backend.entity.Category;
import com.bidflow.backend.repository.CategoryRepository;
import com.bidflow.backend.repository.CategoryRepository.CategoryUsage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    // หมวดตั้งต้น — ลบ/ซ่อนไม่ได้ และอยู่ท้ายรายการเสมอ
    public static final String OTHER_SLUG = "other";

    // เรียงตามชื่อ (ไม่สนตัวพิมพ์) โดยให้ Other อยู่ท้าย
    private static final Comparator<Category> DISPLAY_ORDER = Comparator
            .comparing((Category c) -> OTHER_SLUG.equals(c.getSlug()))
            .thenComparing(Category::getName, String.CASE_INSENSITIVE_ORDER);

    // slug: a-z 0-9 และ "-" · ยาวไม่เกิน 50 เผื่อที่ให้ "-n" (คอลัมน์ยาว 60)
    private static final int MAX_SLUG_BASE_LENGTH = 50;
    private static final Pattern NON_SLUG_CHARS = Pattern.compile("[^a-z0-9]+");
    private static final Pattern ACCENTS = Pattern.compile("\\p{M}+");

    private final CategoryRepository categoryRepository;

    // =====================================================
    // หมวดที่แสดงอยู่ (public) — ใช้ในฟอร์มสร้าง auction และตัวกรอง
    // =====================================================
    @Transactional(readOnly = true)
    public List<CategoryResponse> listActive() {
        return categoryRepository.findByActiveTrue().stream()
                .sorted(DISPLAY_ORDER)
                .map(this::toResponse)
                .toList();
    }

    // =====================================================
    // หมวดสำหรับ auction ใหม่ / ที่เปลี่ยนหมวด — ต้องมีจริงและไม่ถูกซ่อน
    // =====================================================
    @Transactional(readOnly = true)
    public Category getSelectableCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .filter(Category::isActive)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category " + categoryId + " does not exist or is hidden"));
    }

    // =====================================================
    // slug จากตัวกรอง ?category= → id · ว่าง = ไม่กรอง · ไม่มีจริง/ถูกซ่อน = 400
    // =====================================================
    @Transactional(readOnly = true)
    public Long resolveFilterSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return categoryRepository.findBySlug(slug.trim().toLowerCase(Locale.ROOT))
                .filter(Category::isActive)
                .map(Category::getId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "category must be the slug of a visible category (see GET /api/categories)"));
    }

    // หมวดของทั้งหน้าใน query เดียว (id → response) — ไม่เกิด N+1 ตอนแปลง list
    @Transactional(readOnly = true)
    public Map<Long, CategoryResponse> getResponsesByIds(Collection<Long> categoryIds) {
        if (categoryIds.isEmpty()) {
            return Map.of();
        }
        return categoryRepository.findAllById(categoryIds).stream()
                .collect(Collectors.toMap(Category::getId, this::toResponse));
    }

    public CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getSlug());
    }

    // =====================================================
    // Admin: ทุกหมวด (รวมที่ซ่อน) + จำนวน auction
    // =====================================================
    @Transactional(readOnly = true)
    public List<AdminCategoryResponse> listAll() {
        Map<Long, Long> counts = categoryRepository.countAuctionsPerCategory().stream()
                .collect(Collectors.toMap(CategoryUsage::getCategoryId, CategoryUsage::getAuctionCount));
        return categoryRepository.findAll().stream()
                .sorted(DISPLAY_ORDER)
                .map(c -> toAdminResponse(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    // =====================================================
    // Admin: เพิ่มหมวด — ชื่อซ้ำ (ไม่สนตัวพิมพ์) = 409 · slug สร้างครั้งเดียวจากชื่อ
    // =====================================================
    @Transactional
    public AdminCategoryResponse create(CategoryRequest request, String adminUsername) {
        String name = trimToNull(request.name());
        if (name == null) {
            throw new IllegalArgumentException("Name is required");
        }
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw nameTaken(name);
        }

        Category category = Category.builder()
                .name(name)
                .slug(uniqueSlug(name))
                .build();
        saveOrConflict(category, name);

        log.info("Admin '{}' created category '{}' (slug '{}')", adminUsername, name, category.getSlug());
        return toAdminResponse(category, 0);
    }

    // =====================================================
    // Admin: แก้ชื่อ / ซ่อน / แสดง — slug ไม่เปลี่ยน · ซ่อน Other ไม่ได้
    // =====================================================
    @Transactional
    public AdminCategoryResponse update(Long categoryId, CategoryRequest request, String adminUsername) {
        Category category = findCategory(categoryId);

        if (request.name() != null) {
            String name = trimToNull(request.name());
            if (name == null) {
                throw new IllegalArgumentException("Name must not be blank");
            }
            if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, categoryId)) {
                throw nameTaken(name);
            }
            category.setName(name);
        }
        if (request.active() != null) {
            if (!request.active() && isOther(category)) {
                throw new IllegalArgumentException("The 'Other' category cannot be hidden");
            }
            category.setActive(request.active());
        }
        saveOrConflict(category, category.getName());

        log.info("Admin '{}' updated category {} → name '{}', active {}",
                adminUsername, categoryId, category.getName(), category.isActive());
        return toAdminResponse(category, categoryRepository.countAuctions(categoryId));
    }

    // =====================================================
    // Admin: ลบได้เฉพาะหมวดที่ไม่มี auction ใช้ (ถ้ามีให้ซ่อนแทน) · Other ลบไม่ได้
    // =====================================================
    @Transactional
    public void delete(Long categoryId, String adminUsername) {
        Category category = findCategory(categoryId);
        if (isOther(category)) {
            throw new IllegalArgumentException("The 'Other' category cannot be deleted");
        }
        long used = categoryRepository.countAuctions(categoryId);
        if (used > 0) {
            throw inUse(used);
        }
        try {
            categoryRepository.delete(category);
            categoryRepository.flush();
        } catch (DataIntegrityViolationException e) {
            // มี auction ถูกสร้างในหมวดนี้พอดีระหว่างลบ (FK กันไว้)
            throw inUse(1);
        }
        log.info("Admin '{}' deleted category '{}' (slug '{}')", adminUsername, category.getName(), category.getSlug());
    }

    // =====================================================
    // Helpers
    // =====================================================

    private Category findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Category not found: " + categoryId));
    }

    private boolean isOther(Category category) {
        return OTHER_SLUG.equals(category.getSlug());
    }

    // flush ทันทีเพื่อให้ unique index (ชื่อ/slug) ที่ชนกันตอนมี request พร้อมกันกลายเป็น 409 ไม่ใช่ 500
    private void saveOrConflict(Category category, String name) {
        try {
            categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException e) {
            throw nameTaken(name);
        }
    }

    // "Home & Living" → "home-living" · "Café" → "cafe" · แปลงไม่ได้ (เช่นภาษาไทย) → "category" · ซ้ำ → "-2", "-3", ...
    private String uniqueSlug(String name) {
        String ascii = ACCENTS.matcher(Normalizer.normalize(name, Normalizer.Form.NFD)).replaceAll("");
        String base = NON_SLUG_CHARS.matcher(ascii.toLowerCase(Locale.ROOT)).replaceAll("-");
        if (base.length() > MAX_SLUG_BASE_LENGTH) {
            base = base.substring(0, MAX_SLUG_BASE_LENGTH);
        }
        base = base.replaceAll("^-+|-+$", "");
        if (base.isEmpty()) {
            base = "category";
        }

        String slug = base;
        for (int n = 2; categoryRepository.existsBySlug(slug); n++) {
            slug = base + "-" + n;
        }
        return slug;
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static ResponseStatusException nameTaken(String name) {
        return new ResponseStatusException(HttpStatus.CONFLICT, "A category named '" + name + "' already exists");
    }

    private static ResponseStatusException inUse(long auctionCount) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Category is used by " + auctionCount + " auction(s) — hide it instead");
    }

    private AdminCategoryResponse toAdminResponse(Category category, long auctionCount) {
        return new AdminCategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.isActive(),
                auctionCount
        );
    }
}
