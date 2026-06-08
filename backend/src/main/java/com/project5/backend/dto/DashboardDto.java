package com.project5.backend.dto;

import lombok.*;

import java.util.List;

public class DashboardDto {

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response {
        private List<BirthdayItem> upcomingBirthdays;  // 30일 이내 생일
        private List<NotSeenItem> notSeenRecently;     // 30일 이상 못 만난 지인
        private List<RecentMeetingItem> recentMeetings; // 최근 만남 5건
    }

    // 생일 임박 항목
    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BirthdayItem {
        private Long id;
        private String name;
        private String photoUrl;
        private String relationship;
        private String birthday;   // yyyy-MM-dd
        private int daysUntil;     // 0이면 오늘
    }

    // 오래 못 본 지인 항목
    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class NotSeenItem {
        private Long id;
        private String name;
        private String photoUrl;
        private String relationship;
        private String lastMeetingDate; // null이면 만남 기록 없음
        private Long daysSince;         // null이면 만남 기록 없음
    }

    // 최근 만남 항목
    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RecentMeetingItem {
        private Long meetingId;  // 수정/삭제에 필요
        private String groupId;  // 같은 그룹 만남 공유 UUID (그룹핑 기준)
        private Long contactId;
        private String contactName;
        private String contactPhotoUrl;
        private String contactRelationship;
        private String date;
        private List<MeetingDto.PlaceResponse> places;
        private String memo;
    }
}
