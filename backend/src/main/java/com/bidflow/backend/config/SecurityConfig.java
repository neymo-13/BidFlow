package com.bidflow.backend.config;

import com.bidflow.backend.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtAuthFilter jwtAuthFilter;

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public AuthenticationManager authenticationManager(
			AuthenticationConfiguration config) throws Exception {
		return config.getAuthenticationManager();
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				.cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session
						.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				// เพิ่ม JwtAuthFilter ก่อน UsernamePasswordAuthenticationFilte
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
				// ไม่มี auth ให้คืน 401 · login แล้วแต่ไม่มีสิทธิ์ (เช่น USER เรียก
				// /api/admin/**) ให้คืน 403
				// ตั้ง status ตรงๆ ทั้งคู่ (ค่าเริ่มต้นของ 403 ใช้ sendError ซึ่งส่งต่อไป
				// /error อีกรอบ)
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
						.accessDeniedHandler(
								(request, response, denied) -> response.setStatus(HttpStatus.FORBIDDEN.value())))
				.authorizeHttpRequests(auth -> auth
						// Public: register/login
						.requestMatchers("/api/auth/**").permitAll()

						// Health check สำหรับ ALB
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()

						// WebSocket handshake
						.requestMatchers("/ws/**").permitAll()

						// /my ต้อง login
						.requestMatchers(HttpMethod.GET, "/api/auctions/my").authenticated()

						// Auction list + detail = public
						.requestMatchers(HttpMethod.GET, "/api/auctions").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/auctions/*").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/auctions/*/bids").permitAll()

						// หมวดหมู่ = public
						.requestMatchers(HttpMethod.GET, "/api/categories").permitAll()

						// Admin
						.requestMatchers("/api/admin/**").hasRole("ADMIN")

						// ที่เหลือต้อง login
						.anyRequest().authenticated());
		return http.build();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();

		config.setAllowedOrigins(List.of(
				"http://localhost:3000",
				"http://127.0.0.1:3000"));

		config.setAllowedMethods(List.of(
				"GET",
				"POST",
				"PUT",
				"PATCH",
				"DELETE",
				"OPTIONS"));

		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

		source.registerCorsConfiguration("/**", config);

		return source;
	}
}
