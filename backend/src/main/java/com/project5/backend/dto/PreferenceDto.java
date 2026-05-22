package com.project5.backend.dto;

import com.project5.backend.entity.ContactPreference;
import com.project5.backend.entity.ContactPreference.PreferenceType;
import lombok.*;

public class PreferenceDto {

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private PreferenceType type;
        private String value;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private PreferenceType type;
        private String value;

        public static Response from(ContactPreference pref) {
            return Response.builder()
                    .id(pref.getId())
                    .type(pref.getType())
                    .value(pref.getValue())
                    .build();
        }
    }
}
