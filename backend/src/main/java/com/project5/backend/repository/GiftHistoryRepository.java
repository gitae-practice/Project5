package com.project5.backend.repository;

import com.project5.backend.entity.GiftHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GiftHistoryRepository extends JpaRepository<GiftHistory, Long> {
    List<GiftHistory> findByContactIdOrderByDateDesc(Long contactId);
}
