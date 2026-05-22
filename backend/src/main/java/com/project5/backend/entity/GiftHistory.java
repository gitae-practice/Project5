package com.project5.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "gift_history")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiftHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    @Column(nullable = false, length = 100)
    private String item;

    private Integer price;

    private LocalDate date;

    // 생일, 기념일, 크리스마스 등
    @Column(length = 50)
    private String occasion;

    @Column(columnDefinition = "TEXT")
    private String memo;

    // true면 받고 싶다고 한 위시리스트
    @Column(name = "is_wishlist")
    @Builder.Default
    private Boolean isWishlist = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
