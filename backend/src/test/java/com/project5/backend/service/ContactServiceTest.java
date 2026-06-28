package com.project5.backend.service;

import com.project5.backend.dto.MeetingDto;
import com.project5.backend.entity.Contact;
import com.project5.backend.entity.Meeting;
import com.project5.backend.repository.ContactGroupRepository;
import com.project5.backend.repository.ContactPreferenceRepository;
import com.project5.backend.repository.ContactRepository;
import com.project5.backend.repository.GiftHistoryRepository;
import com.project5.backend.repository.MeetingPlaceRepository;
import com.project5.backend.repository.MeetingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactRepository contactRepository;
    @Mock
    private ContactGroupRepository contactGroupRepository;
    @Mock
    private ContactPreferenceRepository preferenceRepository;
    @Mock
    private GiftHistoryRepository giftHistoryRepository;
    @Mock
    private MeetingRepository meetingRepository;
    @Mock
    private MeetingPlaceRepository meetingPlaceRepository;

    private ContactService contactService() {
        return new ContactService(
                contactRepository, contactGroupRepository, preferenceRepository,
                giftHistoryRepository, meetingRepository, meetingPlaceRepository);
    }

    @Test
    void getCompanionNames_returnsEmptyList_whenGroupIdIsNull() {
        Meeting meeting = Meeting.builder().id(1L).groupId(null).build();
        when(meetingRepository.findById(1L)).thenReturn(Optional.of(meeting));

        List<String> result = contactService().getCompanionNames(1L);

        assertThat(result).isEmpty();
    }

    @Test
    void getCompanionNames_excludesSelf_andReturnsOtherContactNames() {
        Contact me = Contact.builder().id(10L).name("안상현").build();
        Contact other = Contact.builder().id(20L).name("손솔비").build();
        Meeting mine = Meeting.builder().id(1L).groupId("g1").contact(me).build();
        Meeting theirs = Meeting.builder().id(2L).groupId("g1").contact(other).build();

        when(meetingRepository.findById(1L)).thenReturn(Optional.of(mine));
        when(meetingRepository.findByGroupId("g1")).thenReturn(List.of(mine, theirs));

        List<String> result = contactService().getCompanionNames(1L);

        assertThat(result).containsExactly("손솔비");
    }

    @Test
    void getPlaceRatingStats_mapsRepositoryRowsToDto() {
        Object[] row = new Object[]{"이디야커피 신대방역점", 3L, 4.5, 2L};
        when(meetingPlaceRepository.findRatingStatsByName()).thenReturn(List.<Object[]>of(row));

        List<MeetingDto.PlaceRatingStat> result = contactService().getPlaceRatingStats();

        assertThat(result).hasSize(1);
        MeetingDto.PlaceRatingStat stat = result.get(0);
        assertThat(stat.getName()).isEqualTo("이디야커피 신대방역점");
        assertThat(stat.getVisitCount()).isEqualTo(3L);
        assertThat(stat.getAvgRating()).isEqualTo(4.5);
        assertThat(stat.getRatingCount()).isEqualTo(2L);
    }
}
