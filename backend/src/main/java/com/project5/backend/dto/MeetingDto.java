package com.project5.backend.dto;

import com.project5.backend.entity.Meeting;
import com.project5.backend.entity.MeetingPlace;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class MeetingDto {

    // 장소 요청 DTO
    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlaceRequest {
        private String name;
        private Double lat;
        private Double lng;
        private Integer rating;
    }

    // 장소 응답 DTO
    @Getter
    @Builder
    public static class PlaceResponse {
        private Long id;
        private String name;
        private Double lat;
        private Double lng;
        private Integer rating;

        public static PlaceResponse from(MeetingPlace mp) {
            return PlaceResponse.builder()
                    .id(mp.getId())
                    .name(mp.getName())
                    .lat(mp.getLat())
                    .lng(mp.getLng())
                    .rating(mp.getRating())
                    .build();
        }
    }

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private LocalDate date;
        private List<PlaceRequest> places;
        private String memo;
    }

    // 여러 지인에게 동시에 만남 기록 추가 (각 지인마다 개별 Meeting 생성)
    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BulkRequest {
        private List<Long> contactIds;
        private LocalDate date;
        private List<PlaceRequest> places;
        private String memo;
        private String groupId; // null이면 서버에서 새 UUID 생성
    }

    // 장소 이름 기준 전역 별점 평균 (동행자/방문일 무관)
    @Getter
    @Builder
    public static class PlaceRatingStat {
        private String name;
        private Double avgRating;
        private Long ratingCount;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long contactId;
        private LocalDate date;
        private List<PlaceResponse> places;
        private String memo;
        private String groupId; // 같은 그룹 만남 공유 UUID
        private LocalDateTime createdAt;

        public static Response from(Meeting meeting) {
            return Response.builder()
                    .id(meeting.getId())
                    .contactId(meeting.getContact().getId())
                    .date(meeting.getDate())
                    .places(meeting.getPlaces().stream()
                            .map(PlaceResponse::from)
                            .collect(Collectors.toList()))
                    .memo(meeting.getMemo())
                    .groupId(meeting.getGroupId())
                    .createdAt(meeting.getCreatedAt())
                    .build();
        }
    }
}
