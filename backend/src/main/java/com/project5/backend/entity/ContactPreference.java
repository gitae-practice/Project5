package com.project5.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contact_preferences")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    // FOOD_LIKE, FOOD_DISLIKE, ALLERGY, INTEREST, BRAND, DISLIKE, ETC
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PreferenceType type;

    @Column(nullable = false, length = 100)
    private String value;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum PreferenceType {
        FOOD_LIKE, FOOD_DISLIKE, ALLERGY, INTEREST, BRAND, DISLIKE, ETC
    }
}
