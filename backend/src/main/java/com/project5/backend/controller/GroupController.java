package com.project5.backend.controller;

import com.project5.backend.dto.GroupDto;
import com.project5.backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class GroupController {

    private final GroupService groupService;

    @GetMapping
    public List<GroupDto.Response> getAll() {
        return groupService.getAll();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody GroupDto.Request req) {
        try {
            return ResponseEntity.ok(groupService.create(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public GroupDto.Response update(@PathVariable Long id, @RequestBody GroupDto.Request req) {
        return groupService.update(id, req);
    }

    @PatchMapping("/order")
    public ResponseEntity<Void> reorder(@RequestBody List<GroupDto.OrderItem> items) {
        groupService.reorder(items);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        groupService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
