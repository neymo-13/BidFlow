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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

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

				if (user != null && jwtService.isTokenValid(token, user)) {
					// 6. สร้าง Authentication object
					var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
					var authToken = new UsernamePasswordAuthenticationToken(
							user.getUsername(),   // principal (ใคร)
							null,                  // credentials (ไม่ต้องใส่แล้ว)
							authorities            // roles/permissions
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
