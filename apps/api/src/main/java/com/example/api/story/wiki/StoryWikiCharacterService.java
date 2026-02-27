package com.example.api.story.wiki;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.story.wiki.dto.StoryWikiCharacterCreateRequest;
import com.example.api.story.wiki.dto.StoryWikiCharacterResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoryWikiCharacterService {

    private final StoryWikiCharacterRepository repository;
    private final StoryRepository storyRepository;

    public StoryWikiCharacterService(StoryWikiCharacterRepository repository, StoryRepository storyRepository) {
        this.repository = repository;
        this.storyRepository = storyRepository;
    }

    @Transactional(readOnly = true)
    public List<StoryWikiCharacterResponse> listByStoryId(Long storyId) {
        return repository.findByStoryIdOrderBySortOrderAsc(storyId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StoryWikiCharacterResponse getById(Long id) {
        return repository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
    }

    @Transactional
    public StoryWikiCharacterResponse create(Long storyId, StoryWikiCharacterCreateRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        if (repository.existsByStoryIdAndName(storyId, request.name())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "角色名称已存在");
        }

        StoryWikiCharacter character = new StoryWikiCharacter(story, request.name());
        character.setAlias(request.alias());
        character.setAvatarUrl(request.avatarUrl());
        if (request.roleType() != null) {
            try {
                character.setRoleType(StoryWikiCharacter.RoleType.valueOf(request.roleType()));
            } catch (IllegalArgumentException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "无效的角色类型");
            }
        }
        character.setAge(request.age());
        character.setGender(request.gender());
        character.setAppearance(request.appearance());
        character.setPersonality(request.personality());
        character.setBackground(request.background());
        character.setAbilities(request.abilities());
        character.setRelationships(request.relationships());
        character.setContentMarkdown(request.contentMarkdown());
        character.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);

        return toResponse(repository.save(character));
    }

    @Transactional
    public void delete(Long id, Long storyId) {
        StoryWikiCharacter character = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
        if (!character.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限删除此角色");
        }
        repository.delete(character);
    }

    private StoryWikiCharacterResponse toResponse(StoryWikiCharacter character) {
        return new StoryWikiCharacterResponse(
                character.getId(),
                character.getStory().getId(),
                character.getName(),
                character.getAlias(),
                character.getAvatarUrl(),
                character.getRoleType() != null ? character.getRoleType().name() : null,
                character.getAge(),
                character.getGender(),
                character.getAppearance(),
                character.getPersonality(),
                character.getBackground(),
                character.getAbilities(),
                character.getRelationships(),
                character.getContentMarkdown(),
                character.getSortOrder(),
                character.getCreatedAt(),
                character.getUpdatedAt()
        );
    }
}
