package com.example.api.readerfork;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.readerfork.dto.StoryPullRequestCreateRequest;
import com.example.api.readerfork.dto.StoryPullRequestResponse;
import com.example.api.readerfork.dto.StoryPullRequestUpdateRequest;
import com.example.api.storyseed.StorySeed;
import com.example.api.storyseed.StorySeedRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class StoryPullRequestServiceImpl implements StoryPullRequestService {

    private final StoryPullRequestRepository storyPullRequestRepository;
    private final StorySeedRepository storySeedRepository;
    private final ReaderForkRepository readerForkRepository;
    private final StoryCommitRepository storyCommitRepository;
    private final UserRepository userRepository;

    public StoryPullRequestServiceImpl(StoryPullRequestRepository storyPullRequestRepository,
            StorySeedRepository storySeedRepository,
            ReaderForkRepository readerForkRepository,
            StoryCommitRepository storyCommitRepository,
            UserRepository userRepository) {
        this.storyPullRequestRepository = storyPullRequestRepository;
        this.storySeedRepository = storySeedRepository;
        this.readerForkRepository = readerForkRepository;
        this.storyCommitRepository = storyCommitRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public StoryPullRequestResponse create(String username, Long storySeedId, StoryPullRequestCreateRequest request) {
        User reader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));
        StorySeed seed = storySeedRepository.findById(storySeedId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));

        ReaderFork fork = readerForkRepository.findById(request.forkId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "阅读副本不存在"));
        if (!fork.getStorySeed().getId().equals(storySeedId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "阅读副本不属于该故事");
        }
        if (!fork.getReader().getId().equals(reader.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        StoryCommit fromCommit = null;
        if (request.fromCommitId() != null) {
            fromCommit = storyCommitRepository.findById(request.fromCommitId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
            if (!fromCommit.getFork().getId().equals(fork.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "章节不属于该阅读副本");
            }
        }

        StoryPullRequest pr = new StoryPullRequest(seed, fork, "open");
        pr.setFromCommit(fromCommit);
        pr.setTitle(request.title() != null ? request.title().trim() : null);
        pr.setDescription(request.description() != null ? request.description().trim() : null);
        StoryPullRequest saved = storyPullRequestRepository.save(pr);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryPullRequestResponse> listByStorySeed(String username, Long storySeedId) {
        StorySeed seed = storySeedRepository.findById(storySeedId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!seed.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return storyPullRequestRepository.findByStorySeed_IdOrderByCreatedAtDesc(storySeedId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StoryPullRequestResponse getById(String username, Long prId) {
        StoryPullRequest pr = storyPullRequestRepository.findById(prId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pull Request 不存在"));
        boolean isAuthor = pr.getStorySeed().getAuthor().getUsername().equals(username);
        boolean isForkOwner = pr.getFork().getReader().getUsername().equals(username);
        if (!isAuthor && !isForkOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return toResponse(pr);
    }

    @Override
    @Transactional
    public StoryPullRequestResponse updateStatus(String username, Long prId, StoryPullRequestUpdateRequest request) {
        StoryPullRequest pr = storyPullRequestRepository.findById(prId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pull Request 不存在"));
        if (!pr.getStorySeed().getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "仅故事作者可处理 PR");
        }
        pr.setStatus(request.status());
        User author = userRepository.findByUsername(username).orElse(null);
        pr.setReviewedBy(author);
        return toResponse(pr);
    }

    private StoryPullRequestResponse toResponse(StoryPullRequest pr) {
        return new StoryPullRequestResponse(
                pr.getId(),
                pr.getStorySeed().getId(),
                pr.getFork().getId(),
                pr.getFromCommit() != null ? pr.getFromCommit().getId() : null,
                pr.getTitle(),
                pr.getDescription(),
                pr.getStatus(),
                pr.getReviewedBy() != null ? pr.getReviewedBy().getId() : null,
                pr.getCreatedAt(),
                pr.getUpdatedAt());
    }
}
