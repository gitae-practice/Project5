package com.project5.backend.dto;

import com.project5.backend.entity.GiftHistory;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class GiftDto {

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String item;
        private Integer price;
        private LocalDate date;
        private String occasion;
        private String memo;
        private Boolean isWishlist;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long contactId;
        private String item;
        private Integer price;
        private LocalDate date;
        private String occasion;
        private String memo;
        private Boolean isWishlist;
        private LocalDateTime createdAt;

        public static Response from(GiftHistory gift) {
            return Response.builder()
                    .id(gift.getId())
                    .contactId(gift.getContact().getId())
                    .item(gift.getItem())
                    .price(gift.getPrice())
                    .date(gift.getDate())
                    .occasion(gift.getOccasion())
                    .memo(gift.getMemo())
                    .isWishlist(gift.getIsWishlist())
                    .createdAt(gift.getCreatedAt())
                    .build();
        }
    }
}
