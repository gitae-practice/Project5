package com.project5.backend.repository;

import com.project5.backend.entity.ContactGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactGroupRepository extends JpaRepository<ContactGroup, Long> {
    List<ContactGroup> findAllByOrderBySortOrderAsc();

    boolean existsByNameIgnoreCase(String name);
}
