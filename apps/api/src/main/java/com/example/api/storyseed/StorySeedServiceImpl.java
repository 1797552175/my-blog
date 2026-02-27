package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.common.SlugUtil;
import com.example.api.story.Story;
import com.example.api.story.StoryChapter;
import com.example.api.story.StoryChapterRepository;
import com.example.api.story.StoryRepository;
import com.example.api.storyseed.dto.StoryBranchPointResponse;
import com.example.api.storyseed.dto.StoryOptionResponse;
import com.example.api.storyseed.dto.StorySeedCreateRequest;
import com.example.api.storyseed.dto.StorySeedListItemResponse;
import com.example.api.storyseed.dto.StorySeedResponse;
import com.example.api.storyseed.dto.StorySeedUpdateRequest;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class StorySeedServiceImpl implements StorySeedService {

    private final StorySeedRepository storySeedRepository;
    private final StoryRepository storyRepository;
    private final StoryBranchPointRepository storyBranchPointRepository;
    private final StoryOptionRepository storyOptionRepository;
    private final StoryCharacterRepository storyCharacterRepository;
    private final StoryTermRepository storyTermRepository;
    private final StoryReadmeRepository storyReadmeRepository;
    private final StoryChapterRepository storyChapterRepository;
    private final UserRepository userRepository;

    public StorySeedServiceImpl(StorySeedRepository storySeedRepository,
            StoryRepository storyRepository,
            StoryBranchPointRepository storyBranchPointRepository,
            StoryOptionRepository storyOptionRepository,
            StoryCharacterRepository storyCharacterRepository,
            StoryTermRepository storyTermRepository,
            StoryReadmeRepository storyReadmeRepository,
            StoryChapterRepository storyChapterRepository,
            UserRepository userRepository) {
        this.storySeedRepository = storySeedRepository;
        this.storyRepository = storyRepository;
        this.storyBranchPointRepository = storyBranchPointRepository;
        this.storyOptionRepository = storyOptionRepository;
        this.storyCharacterRepository = storyCharacterRepository;
        this.storyTermRepository = storyTermRepository;
        this.storyReadmeRepository = storyReadmeRepository;
        this.storyChapterRepository = storyChapterRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StorySeedListItemResponse> listPublished(Pageable pageable) {
        Page<StorySeed> page = storySeedRepository.findByPublishedTrue(pageable);
        return toListItemPage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public StorySeedResponse getBySlug(String slug) {
        StorySeed storySeed = storySeedRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!storySeed.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "故事不存在");
        }
        return toResponse(storySeed);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StorySeedListItemResponse> listMine(String username, Pageable pageable) {
        Page<StorySeed> page = storySeedRepository.findByAuthor_Username(username, pageable);
        return toListItemPage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public StorySeedResponse getByIdForAuthor(String username, Long id) {
        StorySeed storySeed = storySeedRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!storySeed.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return toResponse(storySeed);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<StorySeedListItemResponse> listMineAll(String username) {
        Page<StorySeed> page = storySeedRepository.findByAuthor_Username(username, org.springframework.data.domain.PageRequest.of(0, 1000));
        return page.getContent().stream()
                .map(this::toListItemResponse)
                .toList();
    }

    @Override
    @Transactional
    public StorySeedResponse create(String username, StorySeedCreateRequest request) {
        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        String baseSlug = request.slug() != null && !request.slug().isBlank()
                ? request.slug()
                : SlugUtil.slugify(request.title());
        if (baseSlug.isBlank()) {
            baseSlug = "story";
        }
        String slug = ensureUniqueSlug(baseSlug);

        System.out.println("DEBUG: Creating story - title=" + request.title() + ", published=" + request.published());

        StorySeed storySeed = new StorySeed(
                request.title(),
                slug,
                request.openingMarkdown(),
                request.published(),
                author);
        storySeed.setStyleParams(request.styleParams() != null ? request.styleParams().trim() : null);
        storySeed.setStorySummary(request.openingMarkdown());

        StorySeed saved = storySeedRepository.save(storySeed);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public StorySeedResponse update(String username, Long id, StorySeedUpdateRequest request) {
        StorySeed storySeed = storySeedRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));

        if (!storySeed.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        storySeed.setTitle(request.title());
        storySeed.setOpeningMarkdown(request.openingMarkdown());
        storySeed.setStorySummary(request.openingMarkdown());
        storySeed.setStyleParams(request.styleParams() != null ? request.styleParams().trim() : null);
        storySeed.setPublished(request.published());

        return toResponse(storySeed);
    }

    @Override
    @Transactional
    public void delete(String username, Long id) {
        StorySeed storySeed = storySeedRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));

        if (!storySeed.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        // 删除关联数据 - 先删除子表数据，再删除父表数据
        // 1. 先删除 branch points 下的 options
        storyBranchPointRepository.findByStorySeed_IdOrderBySortOrderAsc(storySeed.getId())
                .forEach(bp -> {
                    storyOptionRepository.findByBranchPoint_IdOrderBySortOrderAsc(bp.getId())
                            .forEach(storyOptionRepository::delete);
                });
        // 2. 删除 branch points
        storyBranchPointRepository.findByStorySeed_IdOrderBySortOrderAsc(storySeed.getId())
                .forEach(storyBranchPointRepository::delete);
        // 3. 删除其他关联数据
        storyCharacterRepository.findByStorySeed_IdOrderBySortOrderAsc(storySeed.getId())
                .forEach(storyCharacterRepository::delete);
        storyTermRepository.findByStorySeed_IdOrderBySortOrderAsc(storySeed.getId())
                .forEach(storyTermRepository::delete);
        storyReadmeRepository.findByStorySeed_Id(storySeed.getId()).ifPresent(storyReadmeRepository::delete);
        storySeedRepository.delete(storySeed);
    }

    private Page<StorySeedListItemResponse> toListItemPage(Page<StorySeed> page) {
        List<StorySeedListItemResponse> content = page.getContent().stream().map(this::toListItemResponse).toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    private StorySeedListItemResponse toListItemResponse(StorySeed storySeed) {
        return new StorySeedListItemResponse(
                storySeed.getId(),
                storySeed.getTitle(),
                storySeed.getSlug(),
                storySeed.getStyleParams(),
                storySeed.getLicenseType(),
                storySeed.isPublished(),
                storySeed.getAuthor().getUsername(),
                storySeed.getCreatedAt(),
                storySeed.getUpdatedAt());
    }

    private StorySeedResponse toResponse(StorySeed storySeed) {
        List<StoryBranchPointResponse> branchPoints = storyBranchPointRepository
                .findByStorySeed_IdOrderBySortOrderAsc(storySeed.getId()).stream()
                .map(this::toBranchPointResponse)
                .toList();
        return new StorySeedResponse(
                storySeed.getId(),
                storySeed.getTitle(),
                storySeed.getSlug(),
                storySeed.getOpeningMarkdown(),
                storySeed.getStyleParams(),
                storySeed.getLicenseType(),
                storySeed.isPublished(),
                storySeed.getAuthor().getId(),
                storySeed.getAuthor().getUsername(),
                storySeed.getCreatedAt(),
                storySeed.getUpdatedAt(),
                branchPoints);
    }

    private StoryBranchPointResponse toBranchPointResponse(StoryBranchPoint point) {
        List<StoryOptionResponse> options = storyOptionRepository.findByBranchPoint_IdOrderBySortOrderAsc(point.getId())
                .stream()
                .map(o -> new StoryOptionResponse(o.getId(), o.getBranchPoint().getId(), o.getLabel(), o.getSortOrder(), o.getInfluenceNotes()))
                .toList();
        return new StoryBranchPointResponse(
                point.getId(),
                point.getStorySeed() != null ? point.getStorySeed().getId() : null,
                point.getSortOrder(),
                point.getAnchorText(),
                options);
    }

    /**
     * 生成唯一的slug
     */
    private String ensureUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 1;
        while (storySeedRepository.findBySlug(slug).isPresent()) {
            String suffix = "-" + counter;
            int maxBaseLength = 220 - suffix.length();
            String base = baseSlug.length() > maxBaseLength ? baseSlug.substring(0, maxBaseLength) : baseSlug;
            slug = base + suffix;
            counter++;
        }
        return slug;
    }
}
