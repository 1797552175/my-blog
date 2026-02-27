package com.example.api.story.wiki;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.story.wiki.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoryWikiService {

    private final StoryWikiPageRepository pageRepository;
    private final StoryWikiCharacterRepository characterRepository;
    private final StoryWikiTimelineEventRepository timelineEventRepository;
    private final StoryRepository storyRepository;

    public StoryWikiService(StoryWikiPageRepository pageRepository,
                           StoryWikiCharacterRepository characterRepository,
                           StoryWikiTimelineEventRepository timelineEventRepository,
                           StoryRepository storyRepository) {
        this.pageRepository = pageRepository;
        this.characterRepository = characterRepository;
        this.timelineEventRepository = timelineEventRepository;
        this.storyRepository = storyRepository;
    }

    // ========== Wiki 页面 ==========

    @Transactional(readOnly = true)
    public List<WikiPageResponse> getPages(Long storyId) {
        return pageRepository.findByStoryIdOrderBySortOrderAsc(storyId).stream()
                .map(WikiPageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WikiPageResponse getPage(Long storyId, String slug) {
        StoryWikiPage page = pageRepository.findByStoryIdAndSlug(storyId, slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wiki页面不存在"));
        return WikiPageResponse.fromEntity(page);
    }

    @Transactional
    public WikiPageResponse createPage(Long storyId, String slug, String title, 
                                       String content, StoryWikiPage.WikiCategory category, Integer sortOrder) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        if (pageRepository.existsByStoryIdAndSlug(storyId, slug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "页面标识已存在");
        }

        StoryWikiPage page = new StoryWikiPage(story, slug, title);
        page.setContentMarkdown(content);
        page.setCategory(category);
        page.setSortOrder(sortOrder != null ? sortOrder : 0);

        return WikiPageResponse.fromEntity(pageRepository.save(page));
    }

    @Transactional
    public WikiPageResponse updatePage(Long storyId, String slug, String title, 
                                       String content, StoryWikiPage.WikiCategory category, Integer sortOrder) {
        StoryWikiPage page = pageRepository.findByStoryIdAndSlug(storyId, slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wiki页面不存在"));

        if (title != null) page.setTitle(title);
        if (content != null) page.setContentMarkdown(content);
        if (category != null) page.setCategory(category);
        if (sortOrder != null) page.setSortOrder(sortOrder);

        return WikiPageResponse.fromEntity(pageRepository.save(page));
    }

    @Transactional
    public void deletePage(Long storyId, String slug) {
        pageRepository.deleteByStoryIdAndSlug(storyId, slug);
    }

    // ========== 角色档案 ==========

    @Transactional(readOnly = true)
    public List<WikiCharacterResponse> getCharacters(Long storyId) {
        return characterRepository.findByStoryIdOrderBySortOrderAsc(storyId).stream()
                .map(WikiCharacterResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WikiCharacterResponse getCharacter(Long storyId, String name) {
        StoryWikiCharacter character = characterRepository.findByStoryIdAndName(storyId, name)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
        return WikiCharacterResponse.fromEntity(character);
    }

    @Transactional
    public WikiCharacterResponse createCharacter(Long storyId, String name, String alias,
                                                  String avatarUrl, StoryWikiCharacter.RoleType roleType,
                                                  String age, String gender, String appearance,
                                                  String personality, String background, String abilities,
                                                  String relationships, String contentMarkdown, Integer sortOrder) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        if (characterRepository.existsByStoryIdAndName(storyId, name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "角色名称已存在");
        }

        StoryWikiCharacter character = new StoryWikiCharacter(story, name);
        character.setAlias(alias);
        character.setAvatarUrl(avatarUrl);
        character.setRoleType(roleType);
        character.setAge(age);
        character.setGender(gender);
        character.setAppearance(appearance);
        character.setPersonality(personality);
        character.setBackground(background);
        character.setAbilities(abilities);
        character.setRelationships(relationships);
        character.setContentMarkdown(contentMarkdown);
        character.setSortOrder(sortOrder != null ? sortOrder : 0);

        return WikiCharacterResponse.fromEntity(characterRepository.save(character));
    }

    @Transactional
    public WikiCharacterResponse updateCharacter(Long storyId, String name, String alias,
                                                  String avatarUrl, StoryWikiCharacter.RoleType roleType,
                                                  String age, String gender, String appearance,
                                                  String personality, String background, String abilities,
                                                  String relationships, String contentMarkdown, Integer sortOrder) {
        StoryWikiCharacter character = characterRepository.findByStoryIdAndName(storyId, name)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));

        if (alias != null) character.setAlias(alias);
        if (avatarUrl != null) character.setAvatarUrl(avatarUrl);
        if (roleType != null) character.setRoleType(roleType);
        if (age != null) character.setAge(age);
        if (gender != null) character.setGender(gender);
        if (appearance != null) character.setAppearance(appearance);
        if (personality != null) character.setPersonality(personality);
        if (background != null) character.setBackground(background);
        if (abilities != null) character.setAbilities(abilities);
        if (relationships != null) character.setRelationships(relationships);
        if (contentMarkdown != null) character.setContentMarkdown(contentMarkdown);
        if (sortOrder != null) character.setSortOrder(sortOrder);

        return WikiCharacterResponse.fromEntity(characterRepository.save(character));
    }

    @Transactional
    public void deleteCharacter(Long storyId, String name) {
        StoryWikiCharacter character = characterRepository.findByStoryIdAndName(storyId, name)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
        characterRepository.delete(character);
    }

    // ========== 时间线事件 ==========

    @Transactional(readOnly = true)
    public List<WikiTimelineEventResponse> getTimelineEvents(Long storyId) {
        return timelineEventRepository.findByStoryIdOrderBySortOrderAsc(storyId).stream()
                .map(WikiTimelineEventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public WikiTimelineEventResponse createTimelineEvent(Long storyId, String eventTime, String title,
                                                          String description, String contentMarkdown,
                                                          String relatedCharacters, Integer sortOrder) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        StoryWikiTimelineEvent event = new StoryWikiTimelineEvent(story, eventTime, title);
        event.setDescription(description);
        event.setContentMarkdown(contentMarkdown);
        event.setRelatedCharacters(relatedCharacters);
        event.setSortOrder(sortOrder != null ? sortOrder : 0);

        return WikiTimelineEventResponse.fromEntity(timelineEventRepository.save(event));
    }

    @Transactional
    public WikiTimelineEventResponse updateTimelineEvent(Long eventId, String eventTime, String title,
                                                          String description, String contentMarkdown,
                                                          String relatedCharacters, Integer sortOrder) {
        StoryWikiTimelineEvent event = timelineEventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "事件不存在"));

        if (eventTime != null) event.setEventTime(eventTime);
        if (title != null) event.setTitle(title);
        if (description != null) event.setDescription(description);
        if (contentMarkdown != null) event.setContentMarkdown(contentMarkdown);
        if (relatedCharacters != null) event.setRelatedCharacters(relatedCharacters);
        if (sortOrder != null) event.setSortOrder(sortOrder);

        return WikiTimelineEventResponse.fromEntity(timelineEventRepository.save(event));
    }

    @Transactional
    public void deleteTimelineEvent(Long eventId) {
        timelineEventRepository.deleteById(eventId);
    }
}
