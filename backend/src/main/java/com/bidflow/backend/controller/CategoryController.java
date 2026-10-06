package com.bidflow.backend.controller;

import com.bidflow.backend.dto.CategoryResponse;
import com.bidflow.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // =====================================================
    // หมวดที่แสดงอยู่ (public) — เรียงตามชื่อ, Other อยู่ท้าย
    // GET /api/categories
    // =====================================================
    @GetMapping
    public List<CategoryResponse> listCategories() {
        return categoryService.listActive();
    }
}
