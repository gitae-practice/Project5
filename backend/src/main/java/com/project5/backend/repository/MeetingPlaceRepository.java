package com.project5.backend.repository;

import com.project5.backend.entity.MeetingPlace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, Long> {
}
