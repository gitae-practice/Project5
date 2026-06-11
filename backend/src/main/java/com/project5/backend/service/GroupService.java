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
        if (groupRepository.existsByNameIgnoreCase(req.getName().trim())) {
            throw new IllegalArgumentException("같은 이름의 그룹이 이미 있어요.");
        }
        int order = (int) groupRepository.count();
        ContactGroup group = ContactGroup.builder()
                .name(req.getName().trim())
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
    public void delete(Long id, boolean deleteContacts) {
        if (deleteContacts) {
            // 소속 지인도 함께 삭제
            contactRepository.deleteAllByGroupId(id);
        } else {
            // 소속 지인을 미분류로 이동
            contactRepository.findByGroupId(id).forEach(c -> c.setGroup(null));
        }
        groupRepository.deleteById(id);
    }
}
