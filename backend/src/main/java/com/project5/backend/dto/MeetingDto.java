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
    }

    // 장소 응답 DTO
    @Getter
    @Builder
    public static class PlaceResponse {
        private Long id;
        private String name;
        private Double lat;
        private Double lng;

        public static PlaceResponse from(MeetingPlace mp) {
            return PlaceResponse.builder()
                    .id(mp.getId())
                    .name(mp.getName())
                    .lat(mp.getLat())
                    .lng(mp.getLng())
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

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long contactId;
        private LocalDate date;
        private List<PlaceResponse> places;
        private String memo;
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
                    .createdAt(meeting.getCreatedAt())
                    .build();
        }
    }
}
