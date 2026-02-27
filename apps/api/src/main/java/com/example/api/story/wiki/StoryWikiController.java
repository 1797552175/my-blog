package com.example.api.story.wiki;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.story.wiki.dto.*;
import com.example.api.user.User;
import com.example.api.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories/{storyId}/wiki")
public class StoryWikiController {

    private final StoryWikiService wikiService;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;

    public StoryWikiController(StoryWikiService wikiService, 
                               StoryRepository storyRepository,
                               UserRepository userRepository) {
        this.wikiService = wikiService;
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
    }

    // ========== Wiki 页面 ==========

    @GetMapping("/pages")
    public List<WikiPageResponse> getPages(@PathVariable Long storyId) {
        return wikiService.getPages(storyId);
    }

    @GetMapping("/pages/{slug}")
    public WikiPageResponse getPage(@PathVariable Long storyId, @PathVariable String slug) {
        return wikiService.getPage(storyId, slug);
    }

    @PostMapping("/pages")
    public WikiPageResponse createPage(@PathVariable Long storyId,
                                        @Valid @RequestBody CreatePageRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.createPage(storyId, request.slug(), request.title(),
                request.content(), request.category(), request.sortOrder());
    }

    @PutMapping("/pages/{slug}")
    public WikiPageResponse updatePage(@PathVariable Long storyId, @PathVariable String slug,
                                        @RequestBody UpdatePageRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.updatePage(storyId, slug, request.title(), 
                request.content(), request.category(), request.sortOrder());
    }

    @DeleteMapping("/pages/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePage(@PathVariable Long storyId, @PathVariable String slug,
                           @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        wikiService.deletePage(storyId, slug);
    }

    // ========== 角色档案 ==========

    @GetMapping("/characters")
    public List<WikiCharacterResponse> getCharacters(@PathVariable Long storyId) {
        return wikiService.getCharacters(storyId);
    }

    @GetMapping("/characters/{name}")
    public WikiCharacterResponse getCharacter(@PathVariable Long storyId, @PathVariable String name) {
        return wikiService.getCharacter(storyId, name);
    }

    @PostMapping("/characters")
    public WikiCharacterResponse createCharacter(@PathVariable Long storyId,
                                                  @RequestBody CreateCharacterRequest request,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.createCharacter(storyId, request.name(), request.alias(),
                request.avatarUrl(), request.roleType(), request.age(), request.gender(),
                request.appearance(), request.personality(), request.background(),
                request.abilities(), request.relationships(), request.contentMarkdown(),
                request.sortOrder());
    }

    @PutMapping("/characters/{name}")
    public WikiCharacterResponse updateCharacter(@PathVariable Long storyId, @PathVariable String name,
                                                  @RequestBody UpdateCharacterRequest request,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.updateCharacter(storyId, name, request.alias(),
                request.avatarUrl(), request.roleType(), request.age(), request.gender(),
                request.appearance(), request.personality(), request.background(),
                request.abilities(), request.relationships(), request.contentMarkdown(),
                request.sortOrder());
    }

    @DeleteMapping("/characters/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCharacter(@PathVariable Long storyId, @PathVariable String name,
                                @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        wikiService.deleteCharacter(storyId, name);
    }

    // ========== 时间线事件 ==========

    @GetMapping("/timeline")
    public List<WikiTimelineEventResponse> getTimelineEvents(@PathVariable Long storyId) {
        return wikiService.getTimelineEvents(storyId);
    }

    @PostMapping("/timeline")
    public WikiTimelineEventResponse createTimelineEvent(@PathVariable Long storyId,
                                                          @Valid @RequestBody CreateTimelineEventRequest request,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.createTimelineEvent(storyId, request.eventTime(), request.title(),
                request.description(), request.contentMarkdown(), request.relatedCharacters(),
                request.sortOrder());
    }

    @PutMapping("/timeline/{eventId}")
    public WikiTimelineEventResponse updateTimelineEvent(@PathVariable Long storyId, @PathVariable Long eventId,
                                                          @RequestBody UpdateTimelineEventRequest request,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        return wikiService.updateTimelineEvent(eventId, request.eventTime(), request.title(),
                request.description(), request.contentMarkdown(), request.relatedCharacters(),
                request.sortOrder());
    }

    @DeleteMapping("/timeline/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimelineEvent(@PathVariable Long storyId, @PathVariable Long eventId,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        checkAuthorPermission(storyId, userDetails);
        wikiService.deleteTimelineEvent(eventId);
    }

    // ========== 权限检查 ==========

    private void checkAuthorPermission(Long storyId, UserDetails userDetails) {
        if (userDetails == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "用户不存在"));

        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        if (!story.getAuthor().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "只有小说作者可以编辑Wiki");
        }
    }

    // ========== 请求 DTOs ==========

    public record CreatePageRequest(@jakarta.validation.constraints.NotBlank String slug, 
                                    @jakarta.validation.constraints.NotBlank String title, 
                                    String content, 
                                    StoryWikiPage.WikiCategory category, 
                                    Integer sortOrder) {}
    public record UpdatePageRequest(String title, String content, 
                                    StoryWikiPage.WikiCategory category, Integer sortOrder) {}

    public record CreateCharacterRequest(String name, String alias, String avatarUrl,
                                         StoryWikiCharacter.RoleType roleType, String age, String gender,
                                         String appearance, String personality, String background,
                                         String abilities, String relationships, String contentMarkdown,
                                         Integer sortOrder) {}
    public record UpdateCharacterRequest(String alias, String avatarUrl,
                                         StoryWikiCharacter.RoleType roleType, String age, String gender,
                                         String appearance, String personality, String background,
                                         String abilities, String relationships, String contentMarkdown,
                                         Integer sortOrder) {}

    public record CreateTimelineEventRequest(@jakarta.validation.constraints.NotBlank String eventTime, 
                                             @jakarta.validation.constraints.NotBlank String title, 
                                             String description,
                                             String contentMarkdown, String relatedCharacters, Integer sortOrder) {}
    public record UpdateTimelineEventRequest(String eventTime, String title, String description,
                                             String contentMarkdown, String relatedCharacters, Integer sortOrder) {}
}
