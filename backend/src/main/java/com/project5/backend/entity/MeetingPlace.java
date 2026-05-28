package com.project5.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meeting_places")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어느 만남에 속하는지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(length = 200)
    private String name;

    // 카카오맵 좌표
    private Double lat;
    private Double lng;

    // 폼에서 추가한 순서 유지
    @Column(name = "sort_order")
    private Integer sortOrder;
}
