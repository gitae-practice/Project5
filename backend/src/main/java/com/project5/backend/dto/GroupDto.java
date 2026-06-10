package com.project5.backend.dto;

import com.project5.backend.entity.ContactGroup;
import lombok.*;

public class GroupDto {

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String name;
    }

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private Long id;
        private Integer sortOrder;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private Integer sortOrder;

        public static Response from(ContactGroup g) {
            return Response.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .sortOrder(g.getSortOrder())
                    .build();
        }
    }
}
