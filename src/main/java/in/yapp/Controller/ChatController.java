package in.yapp.Controller;

import in.yapp.DTO.*;
import in.yapp.Entity.ConversationMember;
import in.yapp.Entity.Message;
import in.yapp.Entity.MessageStatus;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConversationMemberRepository conversationMemberRepository;

    @MessageMapping("/chat")
    public void chat(
            ChatMessageDTO message,
            Principal principal) {



        ChatMessageResult result =
                chatService.saveMessage(
                        message,
                        principal
                );

        messagingTemplate.convertAndSendToUser(
                result.getRecipientUserId().toString(),
                "/queue/messages",
                result.getMessage()
        );

        messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/messages",
                result.getMessage()
        );

        messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/message-status",
                new MessageStatusDTO(
                        result.getMessageId(),
                        result.getMessage().getConversationId(),
                        MessageStatus.SENT
                )
        );
    }

    @MessageMapping("/typing")
    public void typing(
            TypingMessageDTO typingMessageDTO,
            Principal principal) {

        TypingMessageResult result =
                chatService.typing(
                        typingMessageDTO,
                        principal
                );

        List<ConversationMember> members =
                conversationMemberRepository
                        .findByConversationId(
                                typingMessageDTO.getConversationId()
                        );

        members.stream()
                .map(ConversationMember::getUser)
                .filter(user ->
                        !user.getId().equals(
                                UUID.fromString(
                                        principal.getName()
                                )
                        )
                )
                .forEach(user ->
                        messagingTemplate.convertAndSendToUser(
                                user.getId().toString(),
                                "/queue/typing",
                                result
                        )
                );
    }


    @MessageMapping("/read")
    public void markMessageAsRead(
            ReadMessageDTO readMessageDTO,
            Principal principal) {

        Message message =
                chatService.markMessageAsRead(
                        readMessageDTO.getConversationId(),
                        readMessageDTO.getMessageId(),
                        principal
                );

        messagingTemplate.convertAndSendToUser(
                message.getSender().getId().toString(),
                "/queue/message-status",
                new MessageStatusDTO(
                        message.getId(),
                        readMessageDTO.getConversationId(),
                        MessageStatus.READ
                )
        );
    }
}