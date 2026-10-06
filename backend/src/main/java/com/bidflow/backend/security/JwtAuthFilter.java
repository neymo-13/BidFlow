package com.bidflow.backend.security;

import com.bidflow.backend.entity.User;
import com.bidflow.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final UserRepository userRepository;

	@Override
	protected void doFilterInternal(
			@NonNull HttpServletRequest request,
			@NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain
	) throws ServletException, IOException {

		final String authHeader = request.getHeader("Authorization");

		// 1. ถ้าไม่มี header หรือไม่ใช่ "Bearer xxx" ให้ปล่อยผ่าน
		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}

		// 2. ดึง token จาก header
		final String token = authHeader.substring(7);   // ตัด "Bearer " ออก

		try {
			// 3. ดึง username จาก token
			final String username = jwtService.extractUsername(token);

			// 4. ถ้ามี username + ยังไม่ login ใน context
			if (username != null
					&& SecurityContextHolder.getContext().getAuthentication() == null) {

				// 5. โหลด user จาก DB
				User user = userRepository.findByUsername(username).orElse(null);

				// ผู้ใช้ที่ถูกระงับ: ไม่ยืนยันตัวตน → endpoint ที่ต้อง login ได้ 401 ทันที (ไม่ต้องรอ token หมดอายุ)
				if (user != null && user.isSuspended()) {
					log.debug("Rejected token of suspended user: {}", username);
				} else if (user != null && jwtService.isTokenValid(token, user)) {
					// 6. สร้าง Authentication object
					//    role มาจาก DB ทุก request (ไม่เชื่อ claim ใน token) → เปลี่ยน role แล้วมีผลทันที
					var authToken = new UsernamePasswordAuthenticationToken(
							user.getUsername(),    // principal (ใคร)
							null,                  // credentials (ไม่ต้องใส่แล้ว)
							user.getAuthorities()  // ROLE_USER / ROLE_ADMIN
					);
					authToken.setDetails(
							new WebAuthenticationDetailsSource().buildDetails(request)
					);

					// 7. ตั้ง Authentication ใน SecurityContext
					SecurityContextHolder.getContext().setAuthentication(authToken);

					log.debug("Authenticated user: {}", username);
				}
			}
		} catch (Exception e) {
			log.warn("JWT validation failed: {}", e.getMessage());
			// ปล่อยผ่าน = SecurityConfig จะตัดสินใจว่าจะ block หรือไม่
		}

		// 8. ไป filter ตัวต่อไป
		filterChain.doFilter(request, response);
	}
}
