package com.bidflow.backend.dto;

import jakarta.validation.constraints.Size;

// ใช้ทั้งเพิ่ม (POST: name บังคับ — ตรวจใน service) และแก้ (PATCH: ส่งเฉพาะที่เปลี่ยน)
public record CategoryRequest(

        @Size(max = 50, message = "Name must be at most 50 characters")
        String name,

        // false = ซ่อน (ใช้กับ PATCH เท่านั้น)
        Boolean active
) {}
