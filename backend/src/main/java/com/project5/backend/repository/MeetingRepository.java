package com.project5.backend.repository;

import com.project5.backend.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    List<Meeting> findByContactIdOrderByDateDesc(Long contactId);
}
