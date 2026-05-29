package com.project5.backend.service;

import com.project5.backend.dto.DashboardDto;
import com.project5.backend.dto.MeetingDto;
import com.project5.backend.entity.Contact;
import com.project5.backend.repository.ContactRepository;
import com.project5.backend.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ContactRepository contactRepository;
    private final MeetingRepository meetingRepository;

    public DashboardDto.Response getDashboard() {
        LocalDate today = LocalDate.now();
        // me=false인 지인만 대상
        List<Contact> contacts = contactRepository.findByMeOrderByNameAsc(false);

        // 1. 생일 임박 (30일 이내), 가까운 순 정렬
        List<DashboardDto.BirthdayItem> upcomingBirthdays = contacts.stream()
                .filter(c -> c.getBirthday() != null)
                .map(c -> {
                    int days = daysUntilBirthday(c.getBirthday(), today);
                    if (days > 30) return null;
                    return DashboardDto.BirthdayItem.builder()
                            .id(c.getId()).name(c.getName())
                            .photoUrl(c.getPhotoUrl()).relationship(c.getRelationship())
                            .birthday(c.getBirthday().toString()).daysUntil(days)
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(DashboardDto.BirthdayItem::getDaysUntil))
                .collect(Collectors.toList());

        // 2. 오래 못 본 지인: 마지막 만남 날짜 맵 생성
        // MySQL + Hibernate에서 MAX(date) 반환 타입이 LocalDate or java.sql.Date 둘 다 가능
        Map<Long, LocalDate> lastMeetingMap = new HashMap<>();
        for (Object[] row : meetingRepository.findLastMeetingDatePerContact()) {
            Long cid = (Long) row[0];
            Object dateObj = row[1];
            if (dateObj instanceof LocalDate ld) {
                lastMeetingMap.put(cid, ld);
            } else if (dateObj instanceof java.sql.Date sd) {
                lastMeetingMap.put(cid, sd.toLocalDate());
            } else if (dateObj != null) {
                lastMeetingMap.put(cid, LocalDate.parse(dateObj.toString()));
            }
        }

        // 30일 이상 못 만났거나 만남 기록 없는 지인, 최대 5명
        List<DashboardDto.NotSeenItem> notSeenRecently = contacts.stream()
                .map(c -> {
                    LocalDate last = lastMeetingMap.get(c.getId());
                    Long daysSince = last != null ? ChronoUnit.DAYS.between(last, today) : null;
                    // 만남 기록 있고 30일 미만이면 제외
                    if (daysSince != null && daysSince < 30) return null;
                    return DashboardDto.NotSeenItem.builder()
                            .id(c.getId()).name(c.getName())
                            .photoUrl(c.getPhotoUrl()).relationship(c.getRelationship())
                            .lastMeetingDate(last != null ? last.toString() : null)
                            .daysSince(daysSince)
                            .build();
                })
                .filter(Objects::nonNull)
                // 오래된 순, 만남 없는 건 맨 뒤
                .sorted((a, b) -> {
                    if (a.getDaysSince() == null && b.getDaysSince() == null) return 0;
                    if (a.getDaysSince() == null) return 1;
                    if (b.getDaysSince() == null) return -1;
                    return Long.compare(b.getDaysSince(), a.getDaysSince());
                })
                .limit(5)
                .collect(Collectors.toList());

        // 3. 최근 만남 5건
        List<DashboardDto.RecentMeetingItem> recentMeetings = meetingRepository
                .findRecentMeetingsAcrossContacts(PageRequest.of(0, 5))
                .stream()
                .map(m -> DashboardDto.RecentMeetingItem.builder()
                        .contactId(m.getContact().getId())
                        .contactName(m.getContact().getName())
                        .contactPhotoUrl(m.getContact().getPhotoUrl())
                        .contactRelationship(m.getContact().getRelationship())
                        .date(m.getDate().toString())
                        .places(m.getPlaces().stream()
                                .map(MeetingDto.PlaceResponse::from)
                                .collect(Collectors.toList()))
                        .memo(m.getMemo())
                        .build())
                .collect(Collectors.toList());

        return DashboardDto.Response.builder()
                .upcomingBirthdays(upcomingBirthdays)
                .notSeenRecently(notSeenRecently)
                .recentMeetings(recentMeetings)
                .build();
    }

    // 오늘 기준 다음 생일까지 남은 일수 (0 = 오늘)
    private int daysUntilBirthday(LocalDate birthday, LocalDate today) {
        LocalDate thisYear = birthday.withYear(today.getYear());
        if (!thisYear.isBefore(today)) {
            return (int) ChronoUnit.DAYS.between(today, thisYear);
        }
        return (int) ChronoUnit.DAYS.between(today, birthday.withYear(today.getYear() + 1));
    }
}
