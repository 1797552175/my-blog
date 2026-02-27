package com.example.api.persona;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.ai.AiChatService;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class PersonaProfileServiceImpl implements PersonaProfileService {

    private static final int MAX_STORIES_FOR_DISTILL = 20;
    private static final int CONTENT_TRUNCATE_LEN = 500;
    private static final String DISTILL_SYSTEM_PROMPT =
            "请根据以下该作者已发布小说的标题与简介，提炼该作者的写作风格、常写话题、语言特点，输出一段 200 字以内的描述。";

    private final UserPersonaProfileRepository personaProfileRepository;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
    private final AiChatService aiChatService;

    public PersonaProfileServiceImpl(
            UserPersonaProfileRepository personaProfileRepository,
            StoryRepository storyRepository,
            UserRepository userRepository,
            AiChatService aiChatService) {
        this.personaProfileRepository = personaProfileRepository;
        this.storyRepository = storyRepository;
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

        Page<Story> publishedPage = storyRepository.findByAuthor_IdAndPublishedTrueOrderByUpdatedAtDesc(
                authorId, PageRequest.of(0, MAX_STORIES_FOR_DISTILL));
        List<Story> published = publishedPage.getContent();

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

    private String buildDistilledContent(List<Story> published) {
        if (published == null || published.isEmpty()) {
            return "";
        }
        StringBuilder input = new StringBuilder();
        for (Story s : published) {
            input.append("【").append(s.getTitle()).append("】");
            String content = s.getStorySummary();
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
