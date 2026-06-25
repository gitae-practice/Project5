package com.project5.backend.repository;

import com.project5.backend.entity.MeetingPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, Long> {
    // 장소 이름 기준 전역 별점 평균 — 동행자/방문일 무관하게 같은 이름의 모든 방문을 합산
    @Query("SELECT mp.name, AVG(mp.rating), COUNT(mp.rating) FROM MeetingPlace mp WHERE mp.rating IS NOT NULL GROUP BY mp.name")
    List<Object[]> findRatingStatsByName();
}
