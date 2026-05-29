package com.project5.backend.repository;

import com.project5.backend.entity.Contact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findAllByOrderByNameAsc();
    // 대시보드용: isMe 여부로 필터
    List<Contact> findByMeOrderByNameAsc(boolean me);
}
