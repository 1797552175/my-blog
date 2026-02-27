package com.example.api.readerfork;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.readerfork.dto.ReaderForkResponse;
import com.example.api.readerfork.dto.StoryCommitResponse;
import com.example.api.story.Story;
import com.example.api.story.StoryChapter;
import com.example.api.story.StoryChapterRepository;
import com.example.api.story.StoryRepository;
import com.example.api.storyseed.StoryBranchPoint;
import com.example.api.storyseed.StoryBranchPointRepository;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryOption;
import com.example.api.storyseed.StoryOptionRepository;
import com.example.api.storyseed.StoryReadmeRepository;
import com.example.api.storyseed.StorySeed;
import com.example.api.storyseed.StorySeedRepository;
import com.example.api.storyseed.StoryTermRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import com.example.api.ai.AiChatService;
import com.example.api.rag.CommitSummaryService;
import com.example.api.rag.EntityGraphService;
import com.example.api.rag.EntityRecognitionService;
import com.example.api.rag.HybridRAGPromptBuilder;
import com.example.api.rag.HybridRAGPromptBuilder.HybridPromptResult;
import com.example.api.rag.LayeredPromptBuilderV2;
import com.example.api.rag.TimelineService;
import com.example.api.readerfork.dto.BookmarkResponse;
import com.example.api.readerfork.dto.CreateBookmarkRequest;

@Service
public class ReaderForkServiceImpl implements ReaderForkService {

    private static final String STORY_GENERATE_SYSTEM = "你是一位小说续写助手。请根据以下故事设定、已有剧情和读者选择，续写下一段剧情。保持风格一致，输出纯 Markdown 正文，不要输出标题或元信息。";

    private final ReaderForkRepository readerForkRepository;
    private final ReaderForkBookmarkRepository readerForkBookmarkRepository;
    private final StoryCommitRepository storyCommitRepository;
    private final StorySeedRepository storySeedRepository;
    private final StoryBranchPointRepository storyBranchPointRepository;
    private final StoryOptionRepository storyOptionRepository;
    private final StoryCharacterRepository storyCharacterRepository;
    private final StoryTermRepository storyTermRepository;
    private final StoryReadmeRepository storyReadmeRepository;
    private final StoryRepository storyRepository;
    private final StoryChapterRepository storyChapterRepository;
    private final UserRepository userRepository;
    private final AiChatService aiChatService;
    private final CommitSummaryService commitSummaryService;
    private final EntityRecognitionService entityRecognitionService;
    private final EntityGraphService entityGraphService;
    private final TimelineService timelineService;
    private final LayeredPromptBuilderV2 layeredPromptBuilder;
    private final HybridRAGPromptBuilder hybridRAGPromptBuilder;

    public ReaderForkServiceImpl(ReaderForkRepository readerForkRepository,
            ReaderForkBookmarkRepository readerForkBookmarkRepository,
            StoryCommitRepository storyCommitRepository,
            StorySeedRepository storySeedRepository,
            StoryBranchPointRepository storyBranchPointRepository,
            StoryOptionRepository storyOptionRepository,
            StoryCharacterRepository storyCharacterRepository,
            StoryTermRepository storyTermRepository,
            StoryReadmeRepository storyReadmeRepository,
            StoryRepository storyRepository,
            StoryChapterRepository storyChapterRepository,
            UserRepository userRepository,
            AiChatService aiChatService,
            CommitSummaryService commitSummaryService,
            EntityRecognitionService entityRecognitionService,
            EntityGraphService entityGraphService,
            TimelineService timelineService,
            LayeredPromptBuilderV2 layeredPromptBuilder,
            HybridRAGPromptBuilder hybridRAGPromptBuilder) {
        this.readerForkRepository = readerForkRepository;
        this.readerForkBookmarkRepository = readerForkBookmarkRepository;
        this.storyCommitRepository = storyCommitRepository;
        this.storySeedRepository = storySeedRepository;
        this.storyBranchPointRepository = storyBranchPointRepository;
        this.storyOptionRepository = storyOptionRepository;
        this.storyCharacterRepository = storyCharacterRepository;
        this.storyTermRepository = storyTermRepository;
        this.storyReadmeRepository = storyReadmeRepository;
        this.storyRepository = storyRepository;
        this.storyChapterRepository = storyChapterRepository;
        this.userRepository = userRepository;
        this.aiChatService = aiChatService;
        this.commitSummaryService = commitSummaryService;
        this.entityRecognitionService = entityRecognitionService;
        this.entityGraphService = entityGraphService;
        this.timelineService = timelineService;
        this.layeredPromptBuilder = layeredPromptBuilder;
        this.hybridRAGPromptBuilder = hybridRAGPromptBuilder;
    }

    @Override
    @Transactional
    public ReaderForkResponse createFork(String username, Long storyId) {
        User reader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));
        // 使用 StoryRepository 查找故事（故事种子和小说共用 Story 表）
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!story.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "故事不存在");
        }

        // 查找是否已存在 Fork
        Optional<ReaderFork> existing = readerForkRepository.findByStory_IdAndReader_Id(storyId, reader.getId());
        if (existing.isPresent()) {
            return toForkResponse(existing.get());
        }

        // 创建新的 Fork，使用 Story 而不是 StorySeed
        ReaderFork fork = new ReaderFork(story, reader);
        fork.setTitle(story.getTitle());
        ReaderFork saved = readerForkRepository.save(fork);
        return toForkResponse(saved);
    }

    @Override
    @Transactional
    public ReaderForkResponse createForkByStorySlug(String username, String storySlug, Integer fromChapterSortOrder) {
        User reader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        // 1. 先根据 slug 查找 story
        Story story = storyRepository.findBySlugAndPublishedTrue(storySlug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在或未发布"));

        // 2. 检查该 story 是否支持互动阅读（开源小说或有章节）
        boolean isOpenSource = Boolean.TRUE.equals(story.getOpenSource());
        boolean hasChapters = storyChapterRepository.countByStoryId(story.getId()) > 0;
        if (!isOpenSource && !hasChapters) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "该小说不支持互动阅读，请先开源或添加章节");
        }

        // 3. 查找或创建对应的 story_seed
        String openingForSeed = hasChapters ? buildOpeningFromChapters(story.getId(), null) : story.getStorySummary();
        final String opening = openingForSeed;
        StorySeed seed = storySeedRepository.findBySlug(storySlug)
                .orElseGet(() -> {
                    StorySeed newSeed = new StorySeed(
                            story.getTitle(),
                            story.getSlug(),
                            opening,
                            true,
                            story.getAuthor()
                    );
                    newSeed.setStyleParams(story.getStyleParams());
                    newSeed.setLicenseType(story.getOpenSourceLicense());
                    newSeed.setStorySummary(story.getStorySummary());
                    newSeed.setIntentKeywords(story.getIntentKeywords());
                    newSeed = storySeedRepository.save(newSeed);
                    
                    // 为小说的第一章创建默认分支点
                    if (hasChapters) {
                        List<StoryChapter> chapters = storyChapterRepository.findByStoryIdOrderBySortOrderAsc(story.getId());
                        if (!chapters.isEmpty()) {
                            StoryChapter firstChapter = chapters.get(0);
                            // 创建分支点，使用第一章的标题作为分支点锚点文本
                            StoryBranchPoint branchPoint = new StoryBranchPoint(newSeed, 1);
                            branchPoint.setAnchorText(firstChapter.getTitle());
                            branchPoint = storyBranchPointRepository.save(branchPoint);
                            
                            // 创建默认选项
                            StoryOption option1 = new StoryOption(branchPoint, "继续阅读", 1);
                            option1.setPlotHint("按照原剧情继续发展");
                            storyOptionRepository.save(option1);
                            
                            StoryOption option2 = new StoryOption(branchPoint, "探索新方向", 2);
                            option2.setPlotHint("尝试不同的剧情走向");
                            storyOptionRepository.save(option2);
                        }
                    } else {
                        // 如果没有章节，创建默认分支点
                        StoryBranchPoint branchPoint = new StoryBranchPoint(newSeed, 1);
                        branchPoint.setAnchorText("故事开始");
                        branchPoint = storyBranchPointRepository.save(branchPoint);
                        
                        // 创建默认选项
                        StoryOption option1 = new StoryOption(branchPoint, "开始冒险", 1);
                        option1.setPlotHint("主角踏上未知的旅程");
                        storyOptionRepository.save(option1);
                        
                        StoryOption option2 = new StoryOption(branchPoint, "探索周围环境", 2);
                        option2.setPlotHint("主角仔细观察周围的环境");
                        storyOptionRepository.save(option2);
                    }
                    
                    return newSeed;
                });

        // 4. 检查是否已有 fork（同读者同 seed 只保留一个，不按 fromChapterSortOrder 区分）
        Optional<ReaderFork> existing = readerForkRepository.findByStorySeed_IdAndReader_Id(seed.getId(), reader.getId());
        if (existing.isPresent()) {
            return toForkResponse(existing.get());
        }

        // 5. 创建新的 fork
        ReaderFork fork = new ReaderFork(seed, reader);
        fork.setTitle(seed.getTitle());
        fork.setFromChapterSortOrder(fromChapterSortOrder);
        ReaderFork saved = readerForkRepository.save(fork);
        
        // 增加fork计数
        storyRepository.incrementForkCount(story.getId());
        
        return toForkResponse(saved);
    }

    private String buildOpeningFromChapters(Long storyId, Integer upToSortOrder) {
        List<StoryChapter> chapters = upToSortOrder != null && upToSortOrder > 0
                ? storyChapterRepository.findByStoryIdUpToSortOrder(storyId, upToSortOrder)
                : storyChapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);
        StringBuilder sb = new StringBuilder();
        for (StoryChapter c : chapters) {
            if (sb.length() > 0) sb.append("\n\n");
            sb.append("## ").append(c.getTitle()).append("\n\n").append(c.getContentMarkdown() != null ? c.getContentMarkdown() : "");
        }
        return sb.toString();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReaderForkResponse> listMyForks(String username) {
        return readerForkRepository.findByReader_UsernameOrderByUpdatedAtDesc(username).stream()
                .map(this::toForkResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReaderForkResponse getFork(String username, Long forkId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return toForkResponse(fork);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryCommitResponse> listCommits(String username, Long forkId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return storyCommitRepository.findByFork_IdOrderBySortOrderAsc(forkId).stream()
                .map(this::toCommitResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryCommitResponse choose(String username, Long forkId, Long branchPointId, Long optionId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<StoryCommit> commits = storyCommitRepository.findByFork_IdOrderBySortOrderAsc(forkId);
        int nextSortOrder = commits.size() + 1;
        List<StoryBranchPoint> branchPoints = storyBranchPointRepository
                .findByStorySeed_IdOrderBySortOrderAsc(fork.getStorySeed().getId());
        if (nextSortOrder > branchPoints.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "没有更多分支点");
        }
        StoryBranchPoint nextPoint = branchPoints.get(nextSortOrder - 1);
        if (!nextPoint.getId().equals(branchPointId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请按顺序选择当前分支点的选项");
        }

        StoryOption option = storyOptionRepository.findById(optionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "选项不存在"));
        if (!option.getBranchPoint().getId().equals(branchPointId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "选项不属于当前分支点");
        }

        option.setSelectionCount(option.getSelectionCount() + 1);
        storyOptionRepository.save(option);

        // 使用混合RAG模式构建Prompt
        HybridPromptResult promptResult = hybridRAGPromptBuilder.buildPrompt(
                fork.getStorySeed(), commits, option, forkId);
        String generated = aiChatService.chat(List.of(), promptResult.prompt(), STORY_GENERATE_SYSTEM);
        if (generated == null || generated.isBlank()) {
            generated = "*（生成内容为空，请重试或检查 AI 配置）*";
        }

        StoryCommit parent = commits.isEmpty() ? null : commits.get(commits.size() - 1);
        StoryCommit commit = new StoryCommit(fork, parent, nextPoint, option, generated.trim(), nextSortOrder);
        StoryCommit saved = storyCommitRepository.save(commit);

        commitSummaryService.generateSummaryAsync(saved);
        entityRecognitionService.recognizeAndIndexEntitiesAsync(saved, fork.getStorySeed());
        entityGraphService.extractAndBuildRelationshipsAsync(saved, fork.getStorySeed());

        return toCommitResponse(saved);
    }

    @Override
    @Transactional
    public void rollback(String username, Long forkId, Long commitId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        StoryCommit commit = storyCommitRepository.findById(commitId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        if (!commit.getFork().getId().equals(forkId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "章节不属于当前阅读副本");
        }
        storyCommitRepository.deleteByFork_IdAndSortOrderGreaterThan(forkId, commit.getSortOrder());
    }

    @Override
    @Transactional
    public void updateReadingProgress(String username, Long forkId, Long commitId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        storyCommitRepository.findById(commitId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        fork.setLastReadCommitId(commitId);
        readerForkRepository.save(fork);
    }

    @Override
    @Transactional
    public void streamChoose(String username, Long forkId, Long branchPointId, Long optionId, AiChatService.StreamChatCallback callback) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<StoryCommit> commits = storyCommitRepository.findByFork_IdOrderBySortOrderAsc(forkId);
        int nextSortOrder = commits.size() + 1;
        List<StoryBranchPoint> branchPoints = storyBranchPointRepository
                .findByStorySeed_IdOrderBySortOrderAsc(fork.getStorySeed().getId());
        if (nextSortOrder > branchPoints.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "没有更多分支点");
        }
        StoryBranchPoint nextPoint = branchPoints.get(nextSortOrder - 1);
        if (!nextPoint.getId().equals(branchPointId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请按顺序选择当前分支点的选项");
        }

        StoryOption option = storyOptionRepository.findById(optionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "选项不存在"));
        if (!option.getBranchPoint().getId().equals(branchPointId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "选项不属于当前分支点");
        }

        HybridPromptResult promptResult = hybridRAGPromptBuilder.buildPrompt(
                fork.getStorySeed(), commits, option, forkId);

        StringBuilder generatedContent = new StringBuilder();

        try {
            aiChatService.streamChat(
                    List.of(),
                    promptResult.prompt(),
                    STORY_GENERATE_SYSTEM,
                    null,
                    new AiChatService.StreamChatCallback() {
                        @Override
                        public void onChunk(String chunk) {
                            generatedContent.append(chunk);
                            callback.onChunk(chunk);
                        }

                        @Override
                        public void onComplete() {
                            String generated = generatedContent.toString();
                            if (generated == null || generated.isBlank()) {
                                generated = "*（生成内容为空，请重试或检查 AI 配置）*";
                            }

                            StoryCommit parent = commits.isEmpty() ? null : commits.get(commits.size() - 1);
                            StoryCommit commit = new StoryCommit(fork, parent, nextPoint, option, generated.trim(), nextSortOrder);
                            StoryCommit saved = storyCommitRepository.save(commit);

                            commitSummaryService.generateSummaryAsync(saved);
                            entityRecognitionService.recognizeAndIndexEntitiesAsync(saved, fork.getStorySeed());
                            entityGraphService.extractAndBuildRelationshipsAsync(saved, fork.getStorySeed());

                            callback.onComplete();
                        }

                        @Override
                        public void onError(Throwable throwable) {
                            callback.onError(throwable);
                        }
                    }
            );
        } catch (Exception e) {
            callback.onError(e);
        }
    }

    private String buildSystemPrompt(StorySeed seed) {
        StringBuilder sb = new StringBuilder(STORY_GENERATE_SYSTEM);
        if (seed.getStyleParams() != null && !seed.getStyleParams().isBlank()) {
            sb.append("\n\n风格要求：").append(seed.getStyleParams());
        }
        List<com.example.api.storyseed.StoryCharacter> characters = storyCharacterRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());
        if (!characters.isEmpty()) {
            sb.append("\n\n【角色设定】");
            for (com.example.api.storyseed.StoryCharacter c : characters) {
                sb.append("\n- ").append(c.getName()).append("：")
                        .append(c.getDescription() != null ? c.getDescription() : "");
            }
        }
        List<com.example.api.storyseed.StoryTerm> terms = storyTermRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());
        if (!terms.isEmpty()) {
            sb.append("\n\n【专有名词】");
            for (com.example.api.storyseed.StoryTerm t : terms) {
                sb.append("\n- ").append(t.getName()).append("（").append(t.getTermType()).append("）：")
                        .append(t.getDefinition() != null ? t.getDefinition() : "");
            }
        }
        storyReadmeRepository.findByStorySeed_Id(seed.getId()).ifPresent(readme -> {
            if (readme.getContentMarkdown() != null && !readme.getContentMarkdown().isBlank()) {
                sb.append("\n\n【故事设定文档】\n").append(readme.getContentMarkdown());
            }
        });
        return sb.toString();
    }

    private String buildUserContent(StorySeed seed, List<StoryCommit> commits, StoryBranchPoint point, StoryOption option) {
        StringBuilder sb = new StringBuilder();
        sb.append("【故事开头】\n").append(seed.getOpeningMarkdown()).append("\n\n");
        if (!commits.isEmpty()) {
            sb.append("【已有剧情】\n");
            for (StoryCommit c : commits) {
                sb.append(c.getContentMarkdown()).append("\n\n");
            }
        }
        sb.append("【读者选择】分支点");
        if (point.getAnchorText() != null && !point.getAnchorText().isBlank()) {
            sb.append("（").append(point.getAnchorText()).append("）");
        }
        sb.append("：选项「").append(option.getLabel()).append("」");
        if (option.getInfluenceNotes() != null && !option.getInfluenceNotes().isBlank()) {
            sb.append("，影响：").append(option.getInfluenceNotes());
        }
        sb.append("。请续写下一段剧情。");
        return sb.toString();
    }

    private ReaderForkResponse toForkResponse(ReaderFork fork) {
        String storySlug = null;
        if (fork.getStorySeed() != null) {
            storySlug = fork.getStorySeed().getSlug();
        } else if (fork.getStory() != null) {
            storySlug = fork.getStory().getSlug();
        }
        
        return new ReaderForkResponse(
                fork.getId(),
                fork.getStorySeed() != null ? fork.getStorySeed().getId() : null,
                fork.getStorySeed() != null ? fork.getStorySeed().getTitle() : (fork.getStory() != null ? fork.getStory().getTitle() : null),
                storySlug,
                fork.getFromChapterSortOrder(),
                fork.getLastReadCommitId(),
                fork.getReader().getId(),
                fork.getReader().getUsername(),
                fork.getTitle(),
                fork.getCreatedAt(),
                fork.getUpdatedAt());
    }

    private StoryCommitResponse toCommitResponse(StoryCommit c) {
        return new StoryCommitResponse(
                c.getId(),
                c.getFork().getId(),
                c.getParentCommit() != null ? c.getParentCommit().getId() : null,
                c.getBranchPoint() != null ? c.getBranchPoint().getId() : null,
                c.getOption() != null ? c.getOption().getId() : null,
                c.getOption() != null ? c.getOption().getLabel() : null,
                c.getContentMarkdown(),
                c.getSortOrder(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookmarkResponse> listBookmarks(String username, Long forkId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return readerForkBookmarkRepository.findByForkIdAndReaderIdOrderBySortOrderAscCreatedAtAsc(forkId, fork.getReader().getId())
                .stream()
                .map(this::toBookmarkResponse)
                .toList();
    }

    @Override
    @Transactional
    public BookmarkResponse createBookmark(String username, Long forkId, CreateBookmarkRequest request) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        ReaderForkBookmark bookmark = new ReaderForkBookmark();
        bookmark.setForkId(forkId);
        bookmark.setReaderId(fork.getReader().getId());
        bookmark.setCommitId(request.getCommitId());
        bookmark.setChapterSortOrder(request.getChapterSortOrder());
        bookmark.setBookmarkName(request.getBookmarkName());
        bookmark.setNotes(request.getNotes());
        
        if (request.getSortOrder() != null) {
            bookmark.setSortOrder(request.getSortOrder());
        } else {
            Integer maxSortOrder = readerForkBookmarkRepository.findMaxSortOrderByForkIdAndReaderId(forkId, fork.getReader().getId())
                    .orElse(0);
            bookmark.setSortOrder(maxSortOrder + 1);
        }

        ReaderForkBookmark saved = readerForkBookmarkRepository.save(bookmark);
        return toBookmarkResponse(saved);
    }

    @Override
    @Transactional
    public BookmarkResponse updateBookmark(String username, Long forkId, Long bookmarkId, CreateBookmarkRequest request) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        ReaderForkBookmark bookmark = readerForkBookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "书签不存在"));
        
        if (!bookmark.getForkId().equals(forkId) || !bookmark.getReaderId().equals(fork.getReader().getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        bookmark.setCommitId(request.getCommitId());
        bookmark.setChapterSortOrder(request.getChapterSortOrder());
        bookmark.setBookmarkName(request.getBookmarkName());
        bookmark.setNotes(request.getNotes());
        if (request.getSortOrder() != null) {
            bookmark.setSortOrder(request.getSortOrder());
        }

        ReaderForkBookmark saved = readerForkBookmarkRepository.save(bookmark);
        return toBookmarkResponse(saved);
    }

    @Override
    @Transactional
    public void deleteBookmark(String username, Long forkId, Long bookmarkId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        readerForkBookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "书签不存在"));

        readerForkBookmarkRepository.deleteByForkIdAndReaderIdAndId(forkId, fork.getReader().getId(), bookmarkId);
    }

    @Override
    @Transactional
    public void rollbackToBranchPoint(String username, Long forkId, Integer branchPointSortOrder) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<StoryCommit> commits = storyCommitRepository.findByFork_IdOrderBySortOrderAsc(forkId);
        
        if (branchPointSortOrder < 0 || branchPointSortOrder > commits.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的分支点序号");
        }

        if (branchPointSortOrder == 0) {
            storyCommitRepository.deleteByFork_Id(forkId);
        } else {
            StoryCommit targetCommit = commits.get(branchPointSortOrder - 1);
            storyCommitRepository.deleteByFork_IdAndSortOrderGreaterThan(forkId, targetCommit.getSortOrder());
        }
    }

    private BookmarkResponse toBookmarkResponse(ReaderForkBookmark bookmark) {
        String commitTitle = null;
        String commitSummary = null;
        
        if (bookmark.getCommitId() != null) {
            StoryCommit commit = storyCommitRepository.findById(bookmark.getCommitId()).orElse(null);
            if (commit != null) {
                commitTitle = commit.getOption() != null ? commit.getOption().getLabel() : null;
                if (commit.getContentMarkdown() != null) {
                    commitSummary = commit.getContentMarkdown().length() > 100 
                            ? commit.getContentMarkdown().substring(0, 100) + "..." 
                            : commit.getContentMarkdown();
                }
            }
        } else if (bookmark.getChapterSortOrder() != null) {
            commitTitle = "第 " + bookmark.getChapterSortOrder() + " 章";
        }

        return new BookmarkResponse(
                bookmark.getId(),
                bookmark.getCreatedAt(),
                bookmark.getUpdatedAt(),
                bookmark.getForkId(),
                bookmark.getReaderId(),
                bookmark.getCommitId(),
                bookmark.getChapterSortOrder(),
                bookmark.getBookmarkName(),
                bookmark.getNotes(),
                bookmark.getSortOrder(),
                commitTitle,
                commitSummary);
    }

    @Override
    @Transactional
    public void deleteFork(String username, Long forkId) {
        ReaderFork fork = readerForkRepository.findById(forkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getReader().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        storyCommitRepository.deleteByFork_Id(forkId);
        readerForkBookmarkRepository.deleteByForkId(forkId);
        readerForkRepository.deleteById(forkId);
    }
}
