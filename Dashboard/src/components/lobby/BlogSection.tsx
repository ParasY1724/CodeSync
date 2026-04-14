import { Button } from "@/components/ui/button";

const blogContent1 = {
  author: "Paras Yerunkar",
  date: "Frontend Repo",
  title: "Collaborative IDE",
  description:
    "A modern real-time collaborative IDE featuring live cursor tracking, Supabase-powered code sync, WebRTC voice chat, built-in room chat, and full file explorer support. Designed for seamless pair programming and team coding sessions.",
  image:
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop",
  link: "https://github.com/ParasY1724/OnlineJudger",
};


const blogContent2 = {
  author: "Paras Yerunkar",
  date: "Architecture",
  title: "AWS Serverless Architecture – Online Judge",
  description:
    "Deep dive into our cloud-native serverless architecture using AWS Lambda, Fargate, SQS, and DynamoDB to handle massive concurrent code submissions securely.",
  image:
    "https://raw.githubusercontent.com/ParasY1724/OnlineJudger/refs/heads/master/codejudge-serverless/architecture.png",
  link: "https://github.com/ParasY1724/OnlineJudger",
};

const BlogCard = ({ content }: { content: typeof blogContent1 }) => (
  <div className="w-full md:w-80 h-full">
    <div className="relative overflow-hidden h-full rounded-2xl transition duration-300 group bg-[#111] border border-white/10 flex flex-col hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] hover:border-orange-500/50">
      
      <div className="w-full aspect-video bg-neutral-900 overflow-hidden relative min-h-[160px]">
        <img
          src={content.image}
          alt="thumbnail"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h2 className="font-bold my-4 text-lg text-foreground leading-snug">
          {content.title}
        </h2>

        <p className="font-normal mb-4 text-sm text-muted-foreground line-clamp-3">
          {content.description}
        </p>

        <div className="flex flex-row justify-between items-center mt-auto pt-4">
          <span className="text-xs text-muted-foreground font-medium">
            {content.date}
          </span>

          <a
            href={content.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white border-none rounded-lg px-4"
            >
              View on GitHub
            </Button>
          </a>
        </div>
      </div>
    </div>
  </div>
);

export const BlogSection = () => {
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 relative z-10 pointer-events-auto">
      <div className="flex flex-wrap justify-center items-stretch gap-10">
        <BlogCard content={blogContent1} />

        {/* Middle Text */}
        <div className="flex flex-col gap-6 text-center justify-center text-balance py-8 max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-foreground">
            Checkout & <br />
            <span className="gradient-text">Contribute</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Help us build a massively scalable cloud-native online judge.
            Contributions are welcome for enhancements.
          </p>
        </div>

        <BlogCard content={blogContent2} />
      </div>
    </section>
  );
};
