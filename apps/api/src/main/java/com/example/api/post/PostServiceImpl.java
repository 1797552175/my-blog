package com.example.api.post;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.common.SlugUtil;
import com.example.api.inspiration.Inspiration;
import com.example.api.inspiration.InspirationRepository;
import com.example.api.persona.PersonaProfileService;
import com.example.api.post.dto.PostCreateRequest;
import com.example.api.post.dto.PostResponse;
import com.example.api.post.dto.PostUpdateRequest;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class PostServiceImpl implements PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final InspirationRepository inspirationRepository;
    private final PersonaProfileService personaProfileService;

    public PostServiceImpl(PostRepository postRepository, UserRepository userRepository,
            InspirationRepository inspirationRepository, PersonaProfileService personaProfileService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.inspirationRepository = inspirationRepository;
        this.personaProfileService = personaProfileService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listPublished(Pageable pageable) {
        Page<Post> page = postRepository.findByPublishedTrue(pageable);
        return toResponsePage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listPublished(String tag, Pageable pageable) {
        Page<Post> page = postRepository.findByPublishedTrueAndTagsContaining(tag, pageable);
        return toResponsePage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> search(String q, Pageable pageable) {
        Page<Post> page = q == null || q.isBlank()
                ? postRepository.findByPublishedTrue(pageable)
                : postRepository.searchPublishedByKeyword(q.trim(), pageable);
        return toResponsePage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listMine(String username, Pageable pageable) {
        Page<Post> page = postRepository.findByAuthor_Username(username, pageable);
        return toResponsePage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listMine(String username, String tag, Pageable pageable) {
        Page<Post> page = postRepository.findByAuthor_UsernameAndTagsContaining(username, tag.trim(), pageable);
        return toResponsePage(page);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> listMyTags(String username) {
        return postRepository.findDistinctTagsByAuthor_Username(username);
    }

    /** 在事务内完成映射，避免 Page.map() 延迟到序列化时触发导致 LazyInitializationException */
    private Page<PostResponse> toResponsePage(Page<Post> page) {
        List<PostResponse> content = page.getContent().stream().map(this::toResponse).toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "文章不存在"));
        if (!post.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "文章不存在");
        }
        return toResponse(post);
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getByIdForAuthor(String username, Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "文章不存在"));
        if (!post.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        return toResponse(post);
    }

    @Override
    @Transactional
    public PostResponse create(String username, PostCreateRequest request) {
        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        String baseSlug = SlugUtil.slugify(request.title());
        if (baseSlug.isBlank()) {
            baseSlug = "post";
        }
        String slug = ensureUniqueSlug(baseSlug);

        Post post = new Post(request.title(), slug, request.contentMarkdown(), request.published(), author);
        post.getTags().addAll(request.tags() != null ? request.tags() : List.of());
        if (request.inspirationId() != null) {
            Inspiration inspiration = inspirationRepository.findById(request.inspirationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "灵感不存在"));
            if (!inspiration.getUser().getUsername().equals(username)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "无权限关联该灵感");
            }
            post.setInspiration(inspiration);
        }
        Post saved = postRepository.save(post);
        if (request.published()) {
            personaProfileService.updateForAuthor(author.getId());
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PostResponse update(String username, Long id, PostUpdateRequest request) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "文章不存在"));

        if (!post.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        post.setTitle(request.title());
        post.setContentMarkdown(request.contentMarkdown());
        post.setPublished(request.published());
        post.getTags().clear();
        post.getTags().addAll(request.tags() != null ? request.tags() : List.of());
        if (request.inspirationId() != null) {
            Inspiration inspiration = inspirationRepository.findById(request.inspirationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "灵感不存在"));
            if (!inspiration.getUser().getUsername().equals(username)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "无权限关联该灵感");
            }
            post.setInspiration(inspiration);
        } else {
            post.setInspiration(null);
        }

        if (request.published()) {
            personaProfileService.updateForAuthor(post.getAuthor().getId());
        }
        return toResponse(post);
    }

    @Override
    @Transactional
    public void delete(String username, Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "文章不存在"));

        if (!post.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        postRepository.delete(post);
    }

    private PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getContentMarkdown(),
                post.isPublished(),
                post.getTags() != null ? post.getTags() : List.of(),
                post.getAuthor().getId(),
                post.getAuthor().getUsername(),
                post.getAuthor().isPersonaEnabled(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getInspiration() != null ? post.getInspiration().getId() : null);
    }

    private String ensureUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 2;
        while (postRepository.findBySlug(slug).isPresent()) {
            if (counter <= 5) {
                slug = baseSlug + "-" + counter;
                counter++;
            } else {
                slug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 8);
            }
        }
        return slug;
    }
}
