package com.project5.backend.service;

import com.project5.backend.dto.ContactDto;
import com.project5.backend.dto.GiftDto;
import com.project5.backend.dto.MeetingDto;
import com.project5.backend.dto.PreferenceDto;
import com.project5.backend.entity.Contact;
import com.project5.backend.entity.ContactPreference;
import com.project5.backend.entity.GiftHistory;
import com.project5.backend.entity.Meeting;
import com.project5.backend.repository.ContactPreferenceRepository;
import com.project5.backend.repository.ContactRepository;
import com.project5.backend.repository.GiftHistoryRepository;
import com.project5.backend.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContactService {

    private final ContactRepository contactRepository;
    private final ContactPreferenceRepository preferenceRepository;
    private final GiftHistoryRepository giftHistoryRepository;
    private final MeetingRepository meetingRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public List<ContactDto.Summary> getAll() {
        return contactRepository.findAllByOrderByNameAsc().stream()
                .map(ContactDto.Summary::from)
                .collect(Collectors.toList());
    }

    // 교집합 비교용: 취향 포함한 전체 목록
    public List<ContactDto.Response> getAllFull() {
        return contactRepository.findAllByOrderByNameAsc().stream()
                .map(ContactDto.Response::from)
                .collect(Collectors.toList());
    }

    public ContactDto.Response getOne(Long id) {
        Contact contact = findContact(id);
        return ContactDto.Response.from(contact);
    }

    @Transactional
    public ContactDto.Response create(ContactDto.Request req) {
        Contact contact = Contact.builder()
                .name(req.getName())
                .relationship(req.getRelationship())
                .photoUrl(req.getPhotoUrl())
                .birthday(req.getBirthday())
                .memo(req.getMemo())
                .me(Boolean.TRUE.equals(req.getIsMe()))
                .build();
        return ContactDto.Response.from(contactRepository.save(contact));
    }

    @Transactional
    public ContactDto.Response update(Long id, ContactDto.Request req) {
        Contact contact = findContact(id);
        contact.setName(req.getName());
        contact.setRelationship(req.getRelationship());
        contact.setPhotoUrl(req.getPhotoUrl());
        contact.setBirthday(req.getBirthday());
        contact.setMemo(req.getMemo());
        if (req.getIsMe() != null) contact.setMe(req.getIsMe());
        return ContactDto.Response.from(contact);
    }

    @Transactional
    public void delete(Long id) {
        contactRepository.deleteById(id);
    }

    // 취향
    @Transactional
    public PreferenceDto.Response addPreference(Long contactId, PreferenceDto.Request req) {
        Contact contact = findContact(contactId);
        ContactPreference pref = ContactPreference.builder()
                .contact(contact)
                .type(req.getType())
                .value(req.getValue())
                .build();
        return PreferenceDto.Response.from(preferenceRepository.save(pref));
    }

    @Transactional
    public void deletePreference(Long preferenceId) {
        preferenceRepository.deleteById(preferenceId);
    }

    // 선물
    public List<GiftDto.Response> getGifts(Long contactId) {
        return giftHistoryRepository.findByContactIdOrderByDateDesc(contactId).stream()
                .map(GiftDto.Response::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public GiftDto.Response addGift(Long contactId, GiftDto.Request req) {
        Contact contact = findContact(contactId);
        GiftHistory gift = GiftHistory.builder()
                .contact(contact)
                .item(req.getItem())
                .price(req.getPrice())
                .date(req.getDate())
                .occasion(req.getOccasion())
                .memo(req.getMemo())
                .isWishlist(req.getIsWishlist() != null && req.getIsWishlist())
                .build();
        return GiftDto.Response.from(giftHistoryRepository.save(gift));
    }

    @Transactional
    public void deleteGift(Long giftId) {
        giftHistoryRepository.deleteById(giftId);
    }

    // 만남
    public List<MeetingDto.Response> getMeetings(Long contactId) {
        return meetingRepository.findByContactIdOrderByDateDesc(contactId).stream()
                .map(MeetingDto.Response::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public MeetingDto.Response addMeeting(Long contactId, MeetingDto.Request req) {
        Contact contact = findContact(contactId);
        Meeting meeting = Meeting.builder()
                .contact(contact)
                .date(req.getDate())
                .place(req.getPlace())
                .placeLat(req.getPlaceLat())
                .placeLng(req.getPlaceLng())
                .memo(req.getMemo())
                .build();
        return MeetingDto.Response.from(meetingRepository.save(meeting));
    }

    @Transactional
    public MeetingDto.Response updateMeeting(Long meetingId, MeetingDto.Request req) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + meetingId));
        meeting.setDate(req.getDate());
        meeting.setPlace(req.getPlace());
        meeting.setPlaceLat(req.getPlaceLat());
        meeting.setPlaceLng(req.getPlaceLng());
        meeting.setMemo(req.getMemo());
        return MeetingDto.Response.from(meeting);
    }

    @Transactional
    public void deleteMeeting(Long meetingId) {
        meetingRepository.deleteById(meetingId);
    }

    // 프로필 사진 업로드
    @Transactional
    public String uploadPhoto(Long contactId, MultipartFile file) {
        Contact contact = findContact(contactId);
        try {
            String ext = getExtension(file.getOriginalFilename());
            String filename = contactId + "_" + UUID.randomUUID() + ext;
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            String photoUrl = "/uploads/" + filename;
            contact.setPhotoUrl(photoUrl);
            return photoUrl;
        } catch (IOException e) {
            throw new RuntimeException("파일 업로드 실패", e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".jpg";
        return filename.substring(filename.lastIndexOf("."));
    }

    private Contact findContact(Long id) {
        return contactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact not found: " + id));
    }
}
