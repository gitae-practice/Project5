package com.project5.backend.repository;

import com.project5.backend.entity.MeetingPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, Long> {
    // 장소 이름 기준 전역 방문 통계 — 동행자/방문일 무관하게 같은 이름의 모든 방문을 합산
    // (이름, 총 방문 횟수, 별점 평균(별점 없으면 null), 별점 매겨진 방문 수)
    @Query("SELECT mp.name, COUNT(mp.id), AVG(mp.rating), COUNT(mp.rating) FROM MeetingPlace mp GROUP BY mp.name")
    List<Object[]> findRatingStatsByName();
}
