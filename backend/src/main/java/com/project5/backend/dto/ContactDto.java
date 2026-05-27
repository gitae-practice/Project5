package com.project5.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.project5.backend.entity.Contact;
import com.project5.backend.entity.ContactPreference;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ContactDto {

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String name;
        private String relationship;
        private String photoUrl;
        private LocalDate birthday;
        private String memo;
        private Boolean isMe;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private String relationship;
        private String photoUrl;
        private LocalDate birthday;
        private String memo;
        @JsonProperty("isMe")
        private boolean isMe;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<PreferenceDto.Response> preferences;

        public static Response from(Contact contact) {
            return Response.builder()
                    .id(contact.getId())
                    .name(contact.getName())
                    .relationship(contact.getRelationship())
                    .photoUrl(contact.getPhotoUrl())
                    .birthday(contact.getBirthday())
                    .memo(contact.getMemo())
                    .isMe(contact.isMe())
                    .createdAt(contact.getCreatedAt())
                    .updatedAt(contact.getUpdatedAt())
                    .preferences(contact.getPreferences().stream()
                            .map(PreferenceDto.Response::from)
                            .collect(Collectors.toList()))
                    .build();
        }
    }

    @Getter
    @Builder
    public static class Summary {
        private Long id;
        private String name;
        private String relationship;
        private String photoUrl;
        private LocalDate birthday;
        @JsonProperty("isMe")
        private boolean isMe;

        public static Summary from(Contact contact) {
            return Summary.builder()
                    .id(contact.getId())
                    .name(contact.getName())
                    .relationship(contact.getRelationship())
                    .photoUrl(contact.getPhotoUrl())
                    .birthday(contact.getBirthday())
                    .isMe(contact.isMe())
                    .build();
        }
    }
}
