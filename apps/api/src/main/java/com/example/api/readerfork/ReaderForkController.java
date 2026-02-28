package com.example.api.readerfork;

import java.io.IOException;
import java.util.List;

import com.example.api.ai.AiPreviewService;
import com.example.api.ai.AiPreviewSummaryService;
import com.example.api.ai.dto.AiPreviewRequest;
import com.example.api.ai.dto.AiPreviewResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.dto.BookmarkResponse;
import com.example.api.readerfork.dto.ChooseRequest;
import com.example.api.readerfork.dto.CreateBookmarkRequest;
import com.example.api.readerfork.dto.ReaderForkResponse;
import com.example.api.readerfork.dto.RollbackRequest;
import com.example.api.readerfork.dto.RollbackToBranchPointRequest;
import com.example.api.readerfork.dto.StoryCommitResponse;
import com.example.api.readerfork.dto.UpdateProgressRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class ReaderForkController {

    private final ReaderForkService readerForkService;
    private final AiPreviewService aiPreviewService;
    private final AiPreviewSummaryService aiPreviewSummaryService;

    public ReaderForkController(ReaderForkService readerForkService, 
                                AiPreviewService aiPreviewService,
                                AiPreviewSummaryService aiPreviewSummaryService) {
        this.readerForkService = readerForkService;
        this.aiPreviewService = aiPreviewService;
        this.aiPreviewSummaryService = aiPreviewSummaryService;
    }

    @PostMapping("/story-seeds/{storySeedId}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    public ReaderForkResponse createFork(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storySeedId) {
        return readerForkService.createFork(user.getUsername(), storySeedId);
    }

    @GetMapping("/reader-forks/me")
    public List<ReaderForkResponse> listMyForks(@AuthenticationPrincipal UserDetails user) {
        return readerForkService.listMyForks(user.getUsername());
    }

    @GetMapping("/reader-forks/{forkId}")
    public ReaderForkResponse getFork(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        return readerForkService.getFork(user.getUsername(), forkId);
    }

    @GetMapping("/reader-forks/{forkId}/commits")
    public List<StoryCommitResponse> listCommits(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        return readerForkService.listCommits(user.getUsername(), forkId);
    }

    @PostMapping("/reader-forks/{forkId}/choose")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryCommitResponse choose(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody ChooseRequest request) {
        return readerForkService.choose(user.getUsername(), forkId, request.branchPointId(), request.optionId());
    }

    @PostMapping("/reader-forks/{forkId}/rollback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rollback(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody RollbackRequest request) {
        readerForkService.rollback(user.getUsername(), forkId, request.commitId());
    }

    @PostMapping("/reader-forks/{forkId}/progress")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateReadingProgress(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody UpdateProgressRequest request) {
        readerForkService.updateReadingProgress(user.getUsername(), forkId, request.commitId());
    }

    @PostMapping(path = "/reader-forks/{forkId}/stream-choose", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChoose(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody ChooseRequest request) {
        SseEmitter emitter = new SseEmitter(60000L);

        readerForkService.streamChoose(
                user.getUsername(),
                forkId,
                request.branchPointId(),
                request.optionId(),
                new AiChatService.StreamChatCallback() {
                    @Override
                    public void onChunk(String chunk) {
                        try {
                            emitter.send(SseEmitter.event().data(chunk));
                        } catch (IOException e) {
                            emitter.completeWithError(e);
                        }
                    }

                    @Override
                    public void onComplete() {
                        emitter.complete();
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        emitter.completeWithError(throwable);
                    }
                }
        );

        return emitter;
    }

    @GetMapping("/reader-forks/{forkId}/bookmarks")
    public List<BookmarkResponse> listBookmarks(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        return readerForkService.listBookmarks(user.getUsername(), forkId);
    }

    @PostMapping("/reader-forks/{forkId}/bookmarks")
    @ResponseStatus(HttpStatus.CREATED)
    public BookmarkResponse createBookmark(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody CreateBookmarkRequest request) {
        return readerForkService.createBookmark(user.getUsername(), forkId, request);
    }

    @PutMapping("/reader-forks/{forkId}/bookmarks/{bookmarkId}")
    public BookmarkResponse updateBookmark(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @PathVariable Long bookmarkId,
            @Valid @RequestBody CreateBookmarkRequest request) {
        return readerForkService.updateBookmark(user.getUsername(), forkId, bookmarkId, request);
    }

    @DeleteMapping("/reader-forks/{forkId}/bookmarks/{bookmarkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBookmark(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @PathVariable Long bookmarkId) {
        readerForkService.deleteBookmark(user.getUsername(), forkId, bookmarkId);
    }

    @PostMapping("/reader-forks/{forkId}/rollback-to-branch-point")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rollbackToBranchPoint(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody RollbackToBranchPointRequest request) {
        readerForkService.rollbackToBranchPoint(user.getUsername(), forkId, request.branchPointSortOrder());
    }

    @DeleteMapping("/reader-forks/{forkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFork(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        readerForkService.deleteFork(user.getUsername(), forkId);
    }

    // ==================== AI预览章节接口 ====================

    /**
     * 保存AI预览章节
     */
    @PostMapping("/reader-forks/{forkId}/ai-preview")
    @ResponseStatus(HttpStatus.CREATED)
    public void saveAiPreview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @Valid @RequestBody AiPreviewRequest request) {
        // 验证用户是否有权限访问该fork
        readerForkService.getFork(user.getUsername(), forkId);
        
        AiPreviewResponse.AiPreviewChapter chapter = new AiPreviewResponse.AiPreviewChapter(
                request.getChapterNumber(),
                request.getTitle(),
                request.getContentMarkdown(),
                System.currentTimeMillis()
        );
        aiPreviewService.saveAiPreview(forkId.toString(), chapter);
    }

    /**
     * 获取AI预览章节列表
     */
    @GetMapping("/reader-forks/{forkId}/ai-preview")
    public AiPreviewResponse getAiPreview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        // 验证用户是否有权限访问该fork
        readerForkService.getFork(user.getUsername(), forkId);
        
        List<AiPreviewResponse.AiPreviewChapter> chapters = aiPreviewService.getAiPreviewChapters(forkId.toString());
        return new AiPreviewResponse(chapters);
    }

    /**
     * 删除AI预览章节
     */
    @DeleteMapping("/reader-forks/{forkId}/ai-preview")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAiPreview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId) {
        // 验证用户是否有权限访问该fork
        readerForkService.getFork(user.getUsername(), forkId);
        
        aiPreviewService.deleteAiPreview(forkId.toString());
    }

    /**
     * 删除指定章节号的AI预览章节
     */
    @DeleteMapping("/reader-forks/{forkId}/ai-preview/{chapterNumber}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAiPreviewChapter(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @PathVariable Integer chapterNumber) {
        // 验证用户是否有权限访问该fork
        readerForkService.getFork(user.getUsername(), forkId);
        
        aiPreviewService.deleteAiPreviewChapter(forkId.toString(), chapterNumber);
    }

    /**
     * 同步生成AI预览章节的摘要
     */
    @PostMapping("/reader-forks/{forkId}/ai-preview/{chapterNumber}/summary")
    public void generateAiPreviewSummary(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long forkId,
            @PathVariable Integer chapterNumber) {
        // 验证用户是否有权限访问该fork
        readerForkService.getFork(user.getUsername(), forkId);
        
        // 同步生成摘要
        aiPreviewSummaryService.generateAndSaveSummary(forkId.toString(), chapterNumber);
    }
}
