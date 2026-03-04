export type ProTemplate = {
  id: string;
  title: string;
  description: string;
  text: string;
};

export const templates: ProTemplate[] = [
  {
    id: "reject-offer",
    title: "Reject Offer",
    description: "Decline an offer politely while keeping professionalism and goodwill.",
    text: "Thank you for the offer. After careful consideration I have decided not to proceed at this time.",
  },
  {
    id: "delay-decision",
    title: "Delay Decision",
    description: "Request additional time before committing to a final decision.",
    text: "Thank you for the update. I need additional time to evaluate the options carefully before confirming next steps.",
  },
  {
    id: "set-boundaries",
    title: "Set Boundaries",
    description: "Set clear limits and expectations without escalating tension.",
    text: "I want to continue this constructively, but I need communication to stay focused and respectful. Going forward, I will only engage on clear and actionable points.",
  },
  {
    id: "salary-negotiation",
    title: "Salary Negotiation",
    description: "Negotiate compensation with clarity, confidence, and leverage.",
    text: "I appreciate the offer and remain interested. Based on the scope of responsibilities and market benchmarks, I would like to discuss a compensation adjustment that better reflects the role's value.",
  },
  {
    id: "client-pushback",
    title: "Client Pushback",
    description: "Respond to client pressure while preserving standards and options.",
    text: "I understand the urgency. To deliver quality without creating risk, we should align on scope and timeline before proceeding. I can offer two viable paths depending on your priority.",
  },
  {
    id: "professional-decline",
    title: "Professional Decline",
    description: "Decline a request professionally while maintaining the relationship.",
    text: "Thank you for considering me. I need to decline this request at the moment due to current commitments, but I appreciate the opportunity.",
  },
  {
    id: "difficult-manager-reply",
    title: "Difficult Manager Reply",
    description: "Reply to a difficult manager with calm authority and structure.",
    text: "Thanks for the feedback. To move this forward effectively, I need clear priorities, decision criteria, and expected outcomes. Once aligned, I can execute quickly and provide regular progress updates.",
  },
];
