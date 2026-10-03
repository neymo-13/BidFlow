package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AdminCategoryResponse;
import com.bidflow.backend.dto.CategoryRequest;
import com.bidflow.backend.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// สิทธิ์ ADMIN ตรวจที่ SecurityConfig (/api/admin/**)
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    // =====================================================
    // ทุกหมวด (รวมที่ซ่อน) + จำนวน auction
    // GET /api/admin/categories
    // =====================================================
    @GetMapping
    public List<AdminCategoryResponse> listCategories() {
        return categoryService.listAll();
    }

    // =====================================================
    // เพิ่มหมวด { name } → 201 · ชื่อซ้ำ 409
    // POST /api/admin/categories
    // =====================================================
    @PostMapping
    public ResponseEntity<AdminCategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        AdminCategoryResponse response = categoryService.create(request, getCurrentUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // แก้ชื่อ / ซ่อน / แสดง { name?, active? } — slug ไม่เปลี่ยน
    // PATCH /api/admin/categories/{id}
    // =====================================================
    @PatchMapping("/{id}")
    public AdminCategoryResponse updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(id, request, getCurrentUsername());
    }

    // =====================================================
    // ลบ (เฉพาะหมวดที่ไม่มี auction) → 204 · ใช้อยู่ 409 · Other 400
    // DELETE /api/admin/categories/{id}
    // =====================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.delete(id, getCurrentUsername());
        return ResponseEntity.noContent().build();
    }

    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
