package com.example.api.story;

import com.example.api.common.ApiException;
import com.example.api.readerfork.ReaderFork;
import com.example.api.readerfork.ReaderForkRepository;
import com.example.api.readerfork.ReaderForkService;
import com.example.api.readerfork.dto.ReaderForkResponse;
import com.example.api.story.dto.*;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class StoryPrNovelServiceImpl implements StoryPrNovelService {

    private final StoryPrNovelRepository storyPrNovelRepository;
    private final StoryPrChapterRepository storyPrChapterRepository;
    private final StoryPrSubmissionRepository storyPrSubmissionRepository;
    private final StoryRepository storyRepository;
    private final ReaderForkRepository readerForkRepository;
    private final UserRepository userRepository;
    private final ReaderForkService readerForkService;

    public StoryPrNovelServiceImpl(
            StoryPrNovelRepository storyPrNovelRepository,
            StoryPrChapterRepository storyPrChapterRepository,
            StoryPrSubmissionRepository storyPrSubmissionRepository,
            StoryRepository storyRepository,
            ReaderForkRepository readerForkRepository,
            UserRepository userRepository,
            ReaderForkService readerForkService) {
        this.storyPrNovelRepository = storyPrNovelRepository;
        this.storyPrChapterRepository = storyPrChapterRepository;
        this.storyPrSubmissionRepository = storyPrSubmissionRepository;
        this.storyRepository = storyRepository;
        this.readerForkRepository = readerForkRepository;
        this.userRepository = userRepository;
        this.readerForkService = readerForkService;
    }

    @Override
    @Transactional
    public StoryPrNovelResponse create(String username, StoryPrNovelCreateRequest request) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        Story story = storyRepository.findById(request.storyId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        if (!story.isPublished()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "小说未发布");
        }

        // 复用 ReaderForkService 创建 fork（在独立事务中执行）
        ReaderForkResponse forkResponse = readerForkService.createForkByStorySlug(
                username, story.getSlug(), request.fromChapterSortOrder());
        
        // 获取 Fork 实体
        ReaderFork fork = readerForkRepository.findById(forkResponse.id())
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "创建阅读记录失败"));

        StoryPrNovel prNovel = new StoryPrNovel(
                story,
                fork,
                creator,
                request.title(),
                request.fromChapterSortOrder()
        );
        prNovel.setDescription(request.description());

        StoryPrNovel saved = storyPrNovelRepository.save(prNovel);
        return toNovelResponse(saved);
    }

    @Override
    @Transactional
    public StoryPrNovelResponse update(String username, Long prNovelId, StoryPrNovelUpdateRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限修改");
        }

        if (StoryPrNovel.STATUS_SUBMITTED.equals(prNovel.getStatus()) ||
            StoryPrNovel.STATUS_APPROVED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "已提交或已通过的分支小说不能修改");
        }

        if (request.title() != null) {
            prNovel.setTitle(request.title());
        }
        if (request.description() != null) {
            prNovel.setDescription(request.description());
        }

        StoryPrNovel saved = storyPrNovelRepository.save(prNovel);
        return toNovelResponse(saved);
    }

    @Override
    @Transactional
    public void delete(String username, Long prNovelId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限删除");
        }

        storyPrNovelRepository.delete(prNovel);
    }

    @Override
    @Transactional(readOnly = true)
    public StoryPrNovelResponse getById(String username, Long prNovelId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        // 只有创建者或原小说作者可以查看
        boolean isCreator = prNovel.getCreator().getId().equals(user.getId());
        boolean isAuthor = prNovel.getStory().getAuthor().getId().equals(user.getId());

        if (!isCreator && !isAuthor) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限查看");
        }

        return toNovelResponse(prNovel);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPrNovelResponse> listMyPrNovels(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        return storyPrNovelRepository.findByCreator_IdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toNovelResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPrNovelResponse> listPrNovelsByStory(String username, Long storyId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        return storyPrNovelRepository.findByStory_IdAndCreator_Id(storyId, user.getId())
                .stream()
                .map(this::toNovelResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryPrChapterResponse addChapter(String username, Long prNovelId, StoryPrChapterCreateRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限添加章节");
        }

        if (StoryPrNovel.STATUS_SUBMITTED.equals(prNovel.getStatus()) ||
            StoryPrNovel.STATUS_APPROVED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "已提交或已通过的分支小说不能修改");
        }

        // 检查章节序号是否已存在
        Optional<StoryPrChapter> existingChapter = storyPrChapterRepository
                .findByPrNovel_IdAndSortOrder(prNovelId, request.sortOrder());

        if (existingChapter.isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该章节序号已存在");
        }

        StoryPrChapter chapter = new StoryPrChapter(
                prNovel,
                request.sortOrder(),
                request.title()
        );
        chapter.setContentMarkdown(request.contentMarkdown());
        chapter.setSummary(request.summary());

        // 计算字数
        if (request.contentMarkdown() != null) {
            chapter.setWordCount(request.contentMarkdown().length());
        }

        StoryPrChapter saved = storyPrChapterRepository.save(chapter);
        return toChapterResponse(saved);
    }

    @Override
    @Transactional
    public StoryPrChapterResponse updateChapter(String username, Long prNovelId, Long chapterId, StoryPrChapterCreateRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限修改章节");
        }

        if (StoryPrNovel.STATUS_SUBMITTED.equals(prNovel.getStatus()) ||
            StoryPrNovel.STATUS_APPROVED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "已提交或已通过的分支小说不能修改");
        }

        StoryPrChapter chapter = storyPrChapterRepository.findById(chapterId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));

        if (!chapter.getPrNovel().getId().equals(prNovelId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "章节不属于该分支小说");
        }

        chapter.setTitle(request.title());
        chapter.setContentMarkdown(request.contentMarkdown());
        chapter.setSummary(request.summary());

        if (request.contentMarkdown() != null) {
            chapter.setWordCount(request.contentMarkdown().length());
        }

        StoryPrChapter saved = storyPrChapterRepository.save(chapter);
        return toChapterResponse(saved);
    }

    @Override
    @Transactional
    public void deleteChapter(String username, Long prNovelId, Long chapterId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限删除章节");
        }

        if (StoryPrNovel.STATUS_SUBMITTED.equals(prNovel.getStatus()) ||
            StoryPrNovel.STATUS_APPROVED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "已提交或已通过的分支小说不能修改");
        }

        StoryPrChapter chapter = storyPrChapterRepository.findById(chapterId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));

        if (!chapter.getPrNovel().getId().equals(prNovelId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "章节不属于该分支小说");
        }

        storyPrChapterRepository.delete(chapter);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPrChapterResponse> listChapters(String username, Long prNovelId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(prNovelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        boolean isCreator = prNovel.getCreator().getId().equals(user.getId());
        boolean isAuthor = prNovel.getStory().getAuthor().getId().equals(user.getId());

        if (!isCreator && !isAuthor) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限查看");
        }

        return storyPrChapterRepository.findByPrNovel_IdOrderBySortOrderAsc(prNovelId)
                .stream()
                .map(this::toChapterResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryPrSubmissionResponse submit(String username, StoryPrSubmissionCreateRequest request) {
        User submitter = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrNovel prNovel = storyPrNovelRepository.findById(request.prNovelId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支小说不存在"));

        if (!prNovel.getCreator().getId().equals(submitter.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限提交");
        }

        if (StoryPrNovel.STATUS_SUBMITTED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该分支小说已提交");
        }

        if (StoryPrNovel.STATUS_APPROVED.equals(prNovel.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该分支小说已通过审核");
        }

        // 检查是否已有提交记录
        List<StoryPrSubmission> existingSubmissions = storyPrSubmissionRepository
                .findByPrNovel_Id(prNovel.getId());

        if (!existingSubmissions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该分支小说已提交过，请等待审核");
        }

        // 更新分支小说状态
        prNovel.setStatus(StoryPrNovel.STATUS_SUBMITTED);
        prNovel.setSubmittedAt(Instant.now());
        storyPrNovelRepository.save(prNovel);

        // 创建提交记录
        StoryPrSubmission submission = new StoryPrSubmission(
                prNovel,
                prNovel.getStory(),
                submitter,
                request.title(),
                request.description()
        );

        StoryPrSubmission saved = storyPrSubmissionRepository.save(submission);
        return toSubmissionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPrSubmissionResponse> listMySubmissions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        return storyPrSubmissionRepository.findBySubmitter_IdOrderBySubmittedAtDesc(user.getId())
                .stream()
                .map(this::toSubmissionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPrSubmissionResponse> listReceivedSubmissions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        return storyPrSubmissionRepository.findByStory_Author_IdOrderBySubmittedAtDesc(user.getId())
                .stream()
                .map(this::toSubmissionResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryPrSubmissionResponse review(String username, Long submissionId, StoryPrSubmissionReviewRequest request) {
        User reviewer = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        StoryPrSubmission submission = storyPrSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "提交记录不存在"));

        // 只有原小说作者可以审核
        if (!submission.getStory().getAuthor().getId().equals(reviewer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "只有小说作者可以审核");
        }

        if (!StoryPrSubmission.STATUS_PENDING.equals(submission.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该提交已处理");
        }

        // 更新提交记录
        submission.setStatus(request.status());
        submission.setReviewedBy(reviewer);
        submission.setReviewedAt(Instant.now());
        submission.setReviewComment(request.reviewComment());

        StoryPrSubmission saved = storyPrSubmissionRepository.save(submission);

        // 更新分支小说状态
        StoryPrNovel prNovel = submission.getPrNovel();
        if (StoryPrSubmission.STATUS_APPROVED.equals(request.status())) {
            prNovel.setStatus(StoryPrNovel.STATUS_APPROVED);
        } else {
            prNovel.setStatus(StoryPrNovel.STATUS_REJECTED);
        }
        prNovel.setReviewedBy(reviewer);
        prNovel.setReviewedAt(Instant.now());
        prNovel.setReviewComment(request.reviewComment());
        storyPrNovelRepository.save(prNovel);

        return toSubmissionResponse(saved);
    }

    private StoryPrNovelResponse toNovelResponse(StoryPrNovel prNovel) {
        int chapterCount = storyPrChapterRepository.countByPrNovel_Id(prNovel.getId());

        return new StoryPrNovelResponse(
                prNovel.getId(),
                prNovel.getStory().getId(),
                prNovel.getStory().getTitle(),
                prNovel.getStory().getSlug(),
                prNovel.getFork().getId(),
                prNovel.getCreator().getId(),
                prNovel.getCreator().getUsername(),
                prNovel.getTitle(),
                prNovel.getDescription(),
                prNovel.getFromChapterSortOrder(),
                prNovel.getStatus(),
                prNovel.getSubmittedAt(),
                prNovel.getReviewedBy() != null ? prNovel.getReviewedBy().getId() : null,
                prNovel.getReviewedBy() != null ? prNovel.getReviewedBy().getUsername() : null,
                prNovel.getReviewedAt(),
                prNovel.getReviewComment(),
                chapterCount,
                prNovel.getCreatedAt(),
                prNovel.getUpdatedAt()
        );
    }

    private StoryPrChapterResponse toChapterResponse(StoryPrChapter chapter) {
        return new StoryPrChapterResponse(
                chapter.getId(),
                chapter.getPrNovel().getId(),
                chapter.getSortOrder(),
                chapter.getTitle(),
                chapter.getContentMarkdown(),
                chapter.getSummary(),
                chapter.getWordCount(),
                chapter.getCreatedAt(),
                chapter.getUpdatedAt()
        );
    }

    private StoryPrSubmissionResponse toSubmissionResponse(StoryPrSubmission submission) {
        return new StoryPrSubmissionResponse(
                submission.getId(),
                submission.getPrNovel().getId(),
                submission.getPrNovel().getTitle(),
                submission.getStory().getId(),
                submission.getStory().getTitle(),
                submission.getStory().getSlug(),
                submission.getSubmitter().getId(),
                submission.getSubmitter().getUsername(),
                submission.getTitle(),
                submission.getDescription(),
                submission.getStatus(),
                submission.getSubmittedAt(),
                submission.getReviewedBy() != null ? submission.getReviewedBy().getId() : null,
                submission.getReviewedBy() != null ? submission.getReviewedBy().getUsername() : null,
                submission.getReviewedAt(),
                submission.getReviewComment(),
                submission.getCreatedAt(),
                submission.getUpdatedAt()
        );
    }

}