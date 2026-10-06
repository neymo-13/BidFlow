package com.bidflow.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // prefix สำหรับ client subscribe (server → client)
        config.enableSimpleBroker("/topic");

        // prefix สำหรับ client ส่ง message ไป server (client → server)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // endpoint สำหรับ handshake (client connect ที่นี่)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // DEV ONLY — production ต้องระบุ domain
                .withSockJS();                     // fallback สำหรับ browser เก่า
    }
}
