package com.project5.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "contact_groups")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    // 사이드바 표시 순서
    @Column(name = "sort_order")
    private Integer sortOrder;

    // 이 그룹에 속한 지인 목록 (참조용 — cascade 없음, 그룹 삭제 시 서비스에서 수동 해제)
    @OneToMany(mappedBy = "group", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Contact> contacts = new ArrayList<>();
}
