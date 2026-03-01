package com.example.api.story;

import com.example.api.story.dto.*;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class StoryPrNovelController {

    private final StoryPrNovelService storyPrNovelService;

    public StoryPrNovelController(StoryPrNovelService storyPrNovelService) {
        this.storyPrNovelService = storyPrNovelService;
    }

    // ==================== 分支小说管理 ====================

    @PostMapping("/story-pr-novels")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryPrNovelResponse create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StoryPrNovelCreateRequest request) {
        return storyPrNovelService.create(userDetails.getUsername(), request);
    }

    @GetMapping("/story-pr-novels/my")
    public List<StoryPrNovelResponse> listMyPrNovels(
            @AuthenticationPrincipal UserDetails userDetails) {
        return storyPrNovelService.listMyPrNovels(userDetails.getUsername());
    }

    @GetMapping("/story-pr-novels/{prNovelId}")
    public StoryPrNovelResponse getById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId) {
        return storyPrNovelService.getById(userDetails.getUsername(), prNovelId);
    }

    @PutMapping("/story-pr-novels/{prNovelId}")
    public StoryPrNovelResponse update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId,
            @Valid @RequestBody StoryPrNovelUpdateRequest request) {
        return storyPrNovelService.update(userDetails.getUsername(), prNovelId, request);
    }

    @DeleteMapping("/story-pr-novels/{prNovelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId) {
        storyPrNovelService.delete(userDetails.getUsername(), prNovelId);
    }

    // ==================== 章节管理 ====================

    @PostMapping("/story-pr-novels/{prNovelId}/chapters")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryPrChapterResponse addChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId,
            @Valid @RequestBody StoryPrChapterCreateRequest request) {
        return storyPrNovelService.addChapter(userDetails.getUsername(), prNovelId, request);
    }

    @GetMapping("/story-pr-novels/{prNovelId}/chapters")
    public List<StoryPrChapterResponse> listChapters(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId) {
        return storyPrNovelService.listChapters(userDetails.getUsername(), prNovelId);
    }

    @PutMapping("/story-pr-novels/{prNovelId}/chapters/{chapterId}")
    public StoryPrChapterResponse updateChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId,
            @PathVariable Long chapterId,
            @Valid @RequestBody StoryPrChapterCreateRequest request) {
        return storyPrNovelService.updateChapter(userDetails.getUsername(), prNovelId, chapterId, request);
    }

    @DeleteMapping("/story-pr-novels/{prNovelId}/chapters/{chapterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long prNovelId,
            @PathVariable Long chapterId) {
        storyPrNovelService.deleteChapter(userDetails.getUsername(), prNovelId, chapterId);
    }

    // ==================== PR 提交管理 ====================

    @PostMapping("/story-pr-submissions")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryPrSubmissionResponse submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StoryPrSubmissionCreateRequest request) {
        return storyPrNovelService.submit(userDetails.getUsername(), request);
    }

    @GetMapping("/story-pr-submissions/my")
    public List<StoryPrSubmissionResponse> listMySubmissions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return storyPrNovelService.listMySubmissions(userDetails.getUsername());
    }

    @GetMapping("/story-pr-submissions/received")
    public List<StoryPrSubmissionResponse> listReceivedSubmissions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return storyPrNovelService.listReceivedSubmissions(userDetails.getUsername());
    }

    @PostMapping("/story-pr-submissions/{submissionId}/review")
    public StoryPrSubmissionResponse review(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long submissionId,
            @Valid @RequestBody StoryPrSubmissionReviewRequest request) {
        return storyPrNovelService.review(userDetails.getUsername(), submissionId, request);
    }
}
