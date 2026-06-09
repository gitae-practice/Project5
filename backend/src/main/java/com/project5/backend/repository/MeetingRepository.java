package com.project5.backend.repository;

import com.project5.backend.entity.Meeting;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    List<Meeting> findByContactIdOrderByDateDesc(Long contactId);

    // 대시보드용: 지인별 마지막 만남 날짜 (me=false인 지인만)
    @Query("SELECT m.contact.id, MAX(m.date) FROM Meeting m WHERE m.contact.me = false GROUP BY m.contact.id")
    List<Object[]> findLastMeetingDatePerContact();

    // 대시보드용: 전체 지인 최근 만남 N건 (JOIN FETCH로 contact N+1 방지)
    @Query("SELECT m FROM Meeting m JOIN FETCH m.contact WHERE m.contact.me = false ORDER BY m.date DESC")
    List<Meeting> findRecentMeetingsAcrossContacts(Pageable pageable);

    // 대시보드용: 오늘 이후(오늘 포함) 예정된 만남 (가까운 날짜 순)
    @Query("SELECT m FROM Meeting m JOIN FETCH m.contact WHERE m.contact.me = false AND m.date >= :today ORDER BY m.date ASC")
    List<Meeting> findUpcomingMeetings(@Param("today") LocalDate today);
}
