package com.project5.backend.service;

import com.project5.backend.dto.GroupDto;
import com.project5.backend.entity.ContactGroup;
import com.project5.backend.repository.ContactGroupRepository;
import com.project5.backend.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupService {

    private final ContactGroupRepository groupRepository;
    private final ContactRepository contactRepository;

    public List<GroupDto.Response> getAll() {
        return groupRepository.findAllByOrderBySortOrderAsc().stream()
                .map(GroupDto.Response::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public GroupDto.Response create(GroupDto.Request req) {
        // sortOrder = 현재 그룹 수
        int order = (int) groupRepository.count();
        ContactGroup group = ContactGroup.builder()
                .name(req.getName())
                .sortOrder(order)
                .build();
        return GroupDto.Response.from(groupRepository.save(group));
    }

    @Transactional
    public GroupDto.Response update(Long id, GroupDto.Request req) {
        ContactGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found: " + id));
        group.setName(req.getName());
        return GroupDto.Response.from(group);
    }

    @Transactional
    public void reorder(List<GroupDto.OrderItem> items) {
        for (GroupDto.OrderItem item : items) {
            groupRepository.findById(item.getId()).ifPresent(g -> g.setSortOrder(item.getSortOrder()));
        }
    }

    @Transactional
    public void delete(Long id) {
        // 해당 그룹에 속한 지인들을 미분류(null)로 변경
        contactRepository.findByGroupId(id).forEach(c -> c.setGroup(null));
        groupRepository.deleteById(id);
    }
}
