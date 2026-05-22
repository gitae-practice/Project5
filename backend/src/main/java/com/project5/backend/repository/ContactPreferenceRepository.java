package com.project5.backend.repository;

import com.project5.backend.entity.ContactPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactPreferenceRepository extends JpaRepository<ContactPreference, Long> {
    List<ContactPreference> findByContactId(Long contactId);
    void deleteByContactId(Long contactId);
}
