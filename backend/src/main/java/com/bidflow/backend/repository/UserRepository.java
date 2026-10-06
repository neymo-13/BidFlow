package com.bidflow.backend.repository;

import com.bidflow.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<User> findByGoogleSub(String googleSub);

    // อีเมลตรงแบบไม่สนตัวพิมพ์ — อาจได้หลายแถว เพราะการสมัครปกติกันซ้ำแบบตรงทุกตัวอักษรเท่านั้น
    List<User> findByEmailIgnoreCase(String email);

    // ค้นหาผู้ใช้สำหรับหน้า admin — pattern ต้องเป็นตัวเล็ก ครอบด้วย % และ escape % _ \ มาแล้ว
    @Query("""
            select u from User u
            where lower(u.username) like :pattern escape '\\'
               or lower(u.email) like :pattern escape '\\'
               or lower(u.fullName) like :pattern escape '\\'
            """)
    Page<User> search(@Param("pattern") String pattern, Pageable pageable);
}