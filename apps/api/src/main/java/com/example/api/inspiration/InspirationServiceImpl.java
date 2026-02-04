package com.example.api.inspiration;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.inspiration.dto.InspirationCreateRequest;
import com.example.api.inspiration.dto.InspirationListItemResponse;
import com.example.api.inspiration.dto.InspirationMessageResponse;
import com.example.api.inspiration.dto.InspirationResponse;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class InspirationServiceImpl implements InspirationService {

    private final InspirationRepository inspirationRepository;
    private final InspirationMessageRepository messageRepository;
    private final UserRepository userRepository;

    public InspirationServiceImpl(
            InspirationRepository inspirationRepository,
            InspirationMessageRepository messageRepository,
            UserRepository userRepository) {
        this.inspirationRepository = inspirationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public InspirationResponse create(String username, InspirationCreateRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        List<InspirationCreateRequest.MessageItem> items = request.messages() != null ? request.messages() : List.of();
        String title = request.title() != null && !request.title().isBlank()
                ? request.title().trim()
                : null;
        if (title == null && !items.isEmpty()) {
            String firstUser = items.stream()
                    .filter(m -> "user".equalsIgnoreCase(m.role()))
                    .findFirst()
                    .map(InspirationCreateRequest.MessageItem::content)
                    .orElse(null);
            if (firstUser != null && !firstUser.isBlank()) {
                String trimmed = firstUser.trim();
                title = trimmed.length() > 50 ? trimmed.substring(0, 50) : trimmed;
            }
        }
        Inspiration inspiration = new Inspiration(user, title);
        Inspiration saved = inspirationRepository.save(inspiration);

        for (int i = 0; i < items.size(); i++) {
            InspirationCreateRequest.MessageItem item = items.get(i);
            InspirationMessage msg = new InspirationMessage(saved, i, item.role(), item.content());
            messageRepository.save(msg);
        }

        return getById(username, saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InspirationListItemResponse> listMine(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));

        Page<Inspiration> page = inspirationRepository.findByUser_IdOrderByCreatedAtDesc(user.getId(), pageable);
        List<InspirationListItemResponse> content = page.getContent().stream()
                .map(insp -> new InspirationListItemResponse(
                        insp.getId(),
                        insp.getTitle(),
                        insp.getCreatedAt()))
                .toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public InspirationResponse getById(String username, Long id) {
        Inspiration inspiration = inspirationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "灵感不存在"));

        if (!inspiration.getUser().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        List<InspirationMessage> messages = messageRepository.findByInspirationIdOrderBySeqAsc(inspiration.getId());
        List<InspirationMessageResponse> messageResponses = messages.stream()
                .map(m -> new InspirationMessageResponse(m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();

        return new InspirationResponse(
                inspiration.getId(),
                inspiration.getTitle(),
                inspiration.getCreatedAt(),
                messageResponses);
    }

    @Override
    @Transactional
    public void deleteById(String username, Long id) {
        Inspiration inspiration = inspirationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "灵感不存在"));

        if (!inspiration.getUser().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }

        messageRepository.deleteByInspirationId(id);
        inspirationRepository.delete(inspiration);
    }
}
