package com.example.api.persona;

/**
 * 作者分身提炼：根据已发布文章更新 user_persona_profile 的 distilled_content。
 */
public interface PersonaProfileService {

    /**
     * 根据该作者已发布文章（标题 + 正文截断）调用大模型提炼写作风格，写入/更新 user_persona_profile。
     *
     * @param authorId 作者用户 ID
     */
    void updateForAuthor(Long authorId);
}
