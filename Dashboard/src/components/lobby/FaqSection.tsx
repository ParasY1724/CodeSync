import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { question: "Is CodeSync IDE free to use?", answer: "Yes! You can create unlimited rooms and collaborate with unlimited peers for free." },
  { question: "Do I need to create an account?", answer: "You can view rooms as a guest, but to create rooms or save your identity, a simple sign-up is required." },
  { question: "How long do rooms last?", answer: "To ensure performance and privacy, rooms are automatically cleaned up after 5 minutes of total inactivity." },
  { question: "What languages are supported?", answer: "We support all major languages including Javascript/TypeScript, Python, Java, C++, Go, Rust, PHP, and more." }
];

export const FaqSection = () => {
  return (
    <section className="py-24 max-w-4xl mx-auto px-6 relative z-10 pb-40 pointer-events-auto pt-1">
      <h1 className="text-4xl md:text-6xl font-bold text-center gradient-text pb-2 pt-10">FAQs</h1>
      <p className="mt-5 text-muted-foreground/75 text-center mb-16">Here are some of the basic FAQs for you to have a look at!</p>
      
      <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-white/10">
              <AccordionTrigger className="text-lg hover:text-orange-500 hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">{faq.answer}</AccordionContent>
              </AccordionItem>
          ))}
      </Accordion>
    </section>
  );
};