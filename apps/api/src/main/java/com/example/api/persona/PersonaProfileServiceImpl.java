package com.example.api.persona;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.ai.AiChatService;
import com.example.api.post.Post;
import com.example.api.post.PostRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class PersonaProfileServiceImpl implements PersonaProfileService {

    private static final int MAX_POSTS_FOR_DISTILL = 20;
    private static final int CONTENT_TRUNCATE_LEN = 500;
    private static final String DISTILL_SYSTEM_PROMPT =
            "请根据以下该作者已发布文章的标题与正文摘要，提炼该作者的写作风格、常写话题、语言特点，输出一段 200 字以内的描述。";

    private final UserPersonaProfileRepository personaProfileRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final AiChatService aiChatService;

    public PersonaProfileServiceImpl(
            UserPersonaProfileRepository personaProfileRepository,
            PostRepository postRepository,
            UserRepository userRepository,
            AiChatService aiChatService) {
        this.personaProfileRepository = personaProfileRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.aiChatService = aiChatService;
    }

    @Override
    @Transactional
    public void updateForAuthor(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        if (author == null) {
            return;
        }

        List<Post> published = postRepository.findByAuthor_IdAndPublishedTrueOrderByUpdatedAtDesc(
                authorId, PageRequest.of(0, MAX_POSTS_FOR_DISTILL));

        String distilledContent = buildDistilledContent(published);

        UserPersonaProfile profile = personaProfileRepository.findByUserId(authorId).orElse(null);
        if (profile == null) {
            profile = new UserPersonaProfile(author, distilledContent);
        } else {
            profile.setDistilledContent(distilledContent);
            profile.setUpdatedAt(Instant.now());
        }
        personaProfileRepository.save(profile);
    }

    private String buildDistilledContent(List<Post> published) {
        if (published == null || published.isEmpty()) {
            return "";
        }
        StringBuilder input = new StringBuilder();
        for (Post p : published) {
            input.append("【").append(p.getTitle()).append("】");
            String content = p.getContentMarkdown();
            if (content != null && content.length() > CONTENT_TRUNCATE_LEN) {
                content = content.substring(0, CONTENT_TRUNCATE_LEN) + "...";
            }
            if (content != null) {
                input.append(content);
            }
            input.append("\n");
        }
        String userContent = input.length() > 8000 ? input.substring(0, 8000) : input.toString();
        String result = aiChatService.chat(Collections.emptyList(), userContent, DISTILL_SYSTEM_PROMPT);
        return result != null ? result.trim() : "";
    }
}
