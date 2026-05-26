package com.project5.backend.dto;

import com.project5.backend.entity.Meeting;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class MeetingDto {

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private LocalDate date;
        private String place;
        private Double placeLat;
        private Double placeLng;
        private String memo;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long contactId;
        private LocalDate date;
        private String place;
        private Double placeLat;
        private Double placeLng;
        private String memo;
        private LocalDateTime createdAt;

        public static Response from(Meeting meeting) {
            return Response.builder()
                    .id(meeting.getId())
                    .contactId(meeting.getContact().getId())
                    .date(meeting.getDate())
                    .place(meeting.getPlace())
                    .placeLat(meeting.getPlaceLat())
                    .placeLng(meeting.getPlaceLng())
                    .memo(meeting.getMemo())
                    .createdAt(meeting.getCreatedAt())
                    .build();
        }
    }
}
