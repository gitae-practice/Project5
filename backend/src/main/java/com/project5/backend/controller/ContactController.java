package com.project5.backend.controller;

import com.project5.backend.dto.ContactDto;
import com.project5.backend.dto.GiftDto;
import com.project5.backend.dto.MeetingDto;
import com.project5.backend.dto.PreferenceDto;
import com.project5.backend.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ContactController {

    private final ContactService contactService;

    // 지인 목록 (요약)
    @GetMapping
    public List<ContactDto.Summary> getAll() {
        return contactService.getAll();
    }

    // 교집합 비교용 전체 목록 (취향 포함)
    @GetMapping("/full")
    public List<ContactDto.Response> getAllFull() {
        return contactService.getAllFull();
    }

    // 지인 상세
    @GetMapping("/{id}")
    public ContactDto.Response getOne(@PathVariable Long id) {
        return contactService.getOne(id);
    }

    // 지인 추가
    @PostMapping
    public ContactDto.Response create(@RequestBody ContactDto.Request req) {
        return contactService.create(req);
    }

    // 지인 수정
    @PutMapping("/{id}")
    public ContactDto.Response update(@PathVariable Long id, @RequestBody ContactDto.Request req) {
        return contactService.update(id, req);
    }

    // 지인 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contactService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // 관계(그룹) 변경 — 드래그앤드롭 전용 경량 엔드포인트
    @PatchMapping("/{id}/relationship")
    public ResponseEntity<Void> updateRelationship(@PathVariable Long id, @RequestBody Map<String, String> body) {
        contactService.updateRelationship(id, body.get("relationship"));
        return ResponseEntity.ok().build();
    }

    // 프로필 사진 업로드
    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        String photoUrl = contactService.uploadPhoto(id, file);
        return ResponseEntity.ok(Map.of("photoUrl", photoUrl));
    }

    // 취향 추가
    @PostMapping("/{id}/preferences")
    public PreferenceDto.Response addPreference(@PathVariable Long id, @RequestBody PreferenceDto.Request req) {
        return contactService.addPreference(id, req);
    }

    // 취향 삭제
    @DeleteMapping("/preferences/{preferenceId}")
    public ResponseEntity<Void> deletePreference(@PathVariable Long preferenceId) {
        contactService.deletePreference(preferenceId);
        return ResponseEntity.noContent().build();
    }

    // 선물 목록
    @GetMapping("/{id}/gifts")
    public List<GiftDto.Response> getGifts(@PathVariable Long id) {
        return contactService.getGifts(id);
    }

    // 선물 추가
    @PostMapping("/{id}/gifts")
    public GiftDto.Response addGift(@PathVariable Long id, @RequestBody GiftDto.Request req) {
        return contactService.addGift(id, req);
    }

    // 선물 삭제
    @DeleteMapping("/gifts/{giftId}")
    public ResponseEntity<Void> deleteGift(@PathVariable Long giftId) {
        contactService.deleteGift(giftId);
        return ResponseEntity.noContent().build();
    }

    // 만남 목록
    @GetMapping("/{id}/meetings")
    public List<MeetingDto.Response> getMeetings(@PathVariable Long id) {
        return contactService.getMeetings(id);
    }

    // 만남 추가
    @PostMapping("/{id}/meetings")
    public MeetingDto.Response addMeeting(@PathVariable Long id, @RequestBody MeetingDto.Request req) {
        return contactService.addMeeting(id, req);
    }

    // 만남 수정
    @PutMapping("/meetings/{meetingId}")
    public MeetingDto.Response updateMeeting(@PathVariable Long meetingId, @RequestBody MeetingDto.Request req) {
        return contactService.updateMeeting(meetingId, req);
    }

    // 만남 삭제
    @DeleteMapping("/meetings/{meetingId}")
    public ResponseEntity<Void> deleteMeeting(@PathVariable Long meetingId) {
        contactService.deleteMeeting(meetingId);
        return ResponseEntity.noContent().build();
    }
}
